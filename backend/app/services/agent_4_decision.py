import logging

logger = logging.getLogger(__name__)

VALID_VERDICTS = {"clean", "tampered", "missing", "mismatched", "reused"}
VALID_ACTIONS = {
    "Accept",
    "Quarantine & Escalate",
    "Request Vendor Verification",
    "Request Additional Angle",
    "Retake",
    "Escalate with evidence",
    "Escalate to vendor",
    "Triage Agent requests retake",
}

# Keyword groups the Vision LLM's free-text report is scanned for, ordered
# most-severe-first. First group that matches wins. Kept intentionally small
# and literal (not fuzzy) — this is a tie-breaker for ambiguous cases, not
# the primary detector, so false positives here should be rare by design.
_MULTIMODAL_KEYWORD_RULES = [
    (
        {"counterfeit", "tamper", "tampered", "broken seal", "seal removed", "swapped", "different component"},
        "Tampered (Visual AI flagged)", "tampered", "Quarantine & Escalate", 55, 0.55,
    ),
    (
        {"missing capacitor", "missing component", "component missing", "absent", "not present", "no sticker", "sticker missing"},
        "Missing component (Visual AI flagged)", "missing", "Quarantine & Escalate", 50, 0.55,
    ),
    (
        {"serial mismatch", "label mismatch", "wrong serial", "altered text", "text does not match", "incorrect label"},
        "Label mismatch (Visual AI flagged)", "mismatched", "Escalate with evidence", 45, 0.55,
    ),
    (
        {"scratch", "scratches", "crack", "cracked", "dent", "physical damage", "discoloration"},
        "Physical damage (Visual AI flagged)", "tampered", "Request Vendor Verification", 40, 0.50,
    ),
    (
        {"residue", "wear pattern", "wear and tear", "previously used", "reused"},
        "Reused board (Visual AI flagged)", "reused", "Request Additional Angle", 30, 0.50,
    ),
]


def _classify_multimodal_keywords(multimodal_report: str) -> tuple[str | None, str | None, str | None, int, float]:
    """
    Scans the Vision LLM's natural-language report for concrete fraud
    keywords and maps the first matching group onto (category, verdict,
    action, fraud_score, confidence). Returns (None, None, None, 0, 0.0)
    when nothing matches or the report is a "no anomalies" / failure note.
    """
    text = (multimodal_report or "").lower()
    if not text or "no anomalies detected" in text or "skipped" in text or "failed" in text:
        return None, None, None, 0, 0.0

    for keywords, category, verdict, action, score, confidence in _MULTIMODAL_KEYWORD_RULES:
        if any(kw in text for kw in keywords):
            return category, verdict, action, score, confidence

    return None, None, None, 0, 0.0


def make_decision(ensemble_results: dict, thresholds: dict | None = None) -> dict:
    """
    Agent 4: Decision & Fusion Judge.
    Evaluates evidence from Vision Layer and computes the final verdict,
    fraud score (0-100), confidence level, and recommended action.

    Uses deterministic rule-based scoring. Each detection result is evaluated
    in priority order: Missing label > Tampered (swap) > Mismatched (OCR) >
    Non-OEM label > Reused board > Clean.

    `thresholds` (e.g. {"ssim": 0.85, "ocrFuzzyPct": 100}) is caller-supplied.
    A service module should never reach into the router layer for config —
    that inverts the dependency direction and breaks if triage.py's config
    shape changes or its module isn't loaded yet. The router/caller is
    responsible for resolving live thresholds and passing them in.

    `ensemble_results["alignment_reliable"]` (bool) tells this agent whether
    Agent 2's homography actually converged. If it didn't, the source and
    reference images are NOT pixel-registered — SSIM and keypoint-ratio are
    then measuring pose/perspective difference, not fraud, and must not be
    trusted at full weight or used to justify an SSIM-driven verdict.
    """
    thresholds = thresholds or {}

    ssim_target = thresholds.get("ssim", 0.85)
    ocr_fuzzy = thresholds.get("ocrFuzzyPct", 100)

    ssim = ensemble_results.get("ssim_score", 1.0)
    ocr_sim = ensemble_results.get("ocr_similarity", 1.0)
    ocr_mismatches = ensemble_results.get("ocr_mismatches", [])
    kp_ratio = ensemble_results.get("keypoint_ratio", 1.0)
    expected_text = ensemble_results.get("expected_text", "")
    detected_text = ensemble_results.get("detected_text", "")
    ocr_diff = ensemble_results.get("ocr_diff") or {}
    suspicious_confusions = ocr_diff.get("suspicious_confusions", [])

    temp_score = ensemble_results.get("template_match_score", 1.0)
    temp_found = ensemble_results.get("template_match_found", True)
    temp_checked = ensemble_results.get("template_match_checked", "template_match_found" in ensemble_results)
    color_sim = ensemble_results.get("color_hist_similarity", 1.0)
    expected_text_is_catalog_verified = bool(ensemble_results.get("expected_text_is_catalog_verified", False))
    raw_vec_match = ensemble_results.get("vector_embedding_match")
    vec_match_available = raw_vec_match is not None
    # If the embedding comparison failed/was skipped, don't pretend it said 85% —
    # fall back to neutral (no evidence either way) and skip it in the weighted score below.
    vec_match = float(raw_vec_match) if vec_match_available else 50.0
    source_reference_identical = bool(ensemble_results.get("source_reference_identical", False))
    anomaly_regions = ensemble_results.get("anomaly_regions", [])
    # Default True for backward compatibility with callers that don't pass it —
    # but any caller running the real pipeline (workflow.py) always supplies it.
    alignment_reliable = bool(ensemble_results.get("alignment_reliable", True))

    logger.info(
        f"[Agent 4] Decision inputs: SSIM={ssim:.3f}, OCR Sim={ocr_sim:.2f}, "
        f"Mismatches={len(ocr_mismatches)}, Keypoints={kp_ratio:.3f}, "
        f"Template Found={temp_found} ({temp_score:.2f}), Color={color_sim:.3f}, Vector Match={vec_match:.1f}%"
    )

    # Invariant: pixel-identical upload = no fraud
    if source_reference_identical:
        logger.info("[Agent 4] Pixel-identical to golden reference. Verdict: CLEAN.")
        return {
            "fraud_score": 0,
            "verdict": "clean",
            "category": "Clean (OEM Verified)",
            "confidence": 1.0,
            "recommended_action": "Accept",
            "reasoning": "The uploaded image is pixel-identical to the approved golden reference. No fraud indicators detected.",
        }

    # --- COMPUTE LOSSES ---
    ssim_loss = max(0.0, 1.0 - ssim)
    ocr_loss = max(0.0, 1.0 - ocr_sim)
    kp_loss = abs(1.0 - kp_ratio)
    color_loss = max(0.0, 1.0 - color_sim)
    vec_loss = max(0.0, (100.0 - vec_match) / 100.0) if vec_match_available else 0.0
    template_loss = 0.0 if temp_found else 1.0
    multimodal_report = ensemble_results.get("multimodal_report", "")
    multimodal_lower = multimodal_report.lower()
    mentions_missing_component = "missing component" in multimodal_lower or "absent" in multimodal_lower
    # A very high vector-embedding match (>= 90%) is strong evidence that the
    # target and reference are the SAME part, even if keypoint ratios are low
    # due to text changes, minor alignment drift, or ROI differences.
    # Do not let keypoint-driven swap evidence override high vector identity.
    high_vector_identity = vec_match_available and vec_match >= 90.0
    strong_identity_match = (ssim >= 0.80 and vec_match >= 90.0) or high_vector_identity
    strong_swap_evidence = alignment_reliable and not high_vector_identity and (
        kp_ratio < 0.35
        or (kp_ratio < 0.55 and (ssim < 0.65 or (vec_match_available and vec_match < 75.0)))
    )
    localized_structural_issue = alignment_reliable and (ssim < max(ssim_target, 0.85) or bool(anomaly_regions))
    # OCR mismatch severity: count how many characters are different
    ocr_mismatch_count = len(ocr_mismatches)
    # Bug fix: suspicious_confusions (0/O, 1/I/|, S/5, etc.) are OCR's most
    # common misreads — they are the LEAST reliable signal of real tampering,
    # not an automatic escalation trigger. The old condition fired on ANY
    # confusable-pair diff regardless of overall similarity, which is
    # backwards. It also used golden-image OCR as "expected_text" ground
    # truth whenever no catalog serial was configured — comparing one noisy
    # OCR read against another and calling the delta "fraud".
    #
    # New rule:
    #   - Non-confusable mismatches always count (real character differences
    #     are real signal regardless of ground-truth source).
    #   - Confusable-only mismatches only count when expected_text came from
    #     a fixed catalog value. Against golden-image OCR, a confusable-only
    #     diff is presumed to be OCR noise on both sides and must not trigger
    #     escalation — it should route to the low-confidence "needs review"
    #     path instead.
    non_confusable_mismatches = [m for m in ocr_mismatches if not m.get("confusable", False)]
    has_real_char_mismatch = len(non_confusable_mismatches) > 0
    has_confusable_only_mismatch = (
        ocr_mismatch_count > 0 and not has_real_char_mismatch and bool(suspicious_confusions)
    )

    has_ocr_mismatch = (
        expected_text
        and detected_text
        and ocr_mismatch_count > 0
        and (ocr_sim * 100) < ocr_fuzzy
        and (has_real_char_mismatch or expected_text_is_catalog_verified)
    )
    has_low_confidence_ocr_noise = (
        expected_text
        and detected_text
        and has_confusable_only_mismatch
        and not expected_text_is_catalog_verified
    )

    # --- DETERMINE VERDICT (Priority order: Most Severe → Least Severe) ---

    category = "Clean (OEM Verified)"
    verdict = "clean"
    recommended_action = "Accept"
    confidence = 0.90
    fraud_score = 0
    reason_note = "All measured optical and character features fall within OEM tolerance."

    # 1. MISSING QC LABEL → Template match failed
    # Bug fix: match_template_roi() returns template_match_found=True when no
    # template_roi is configured (template_match_checked=False) — that's a
    # "not checked" default, not a verified pass, and must never be read as
    # "not found" either. Gate this branch on temp_checked so an unconfigured
    # ROI can't silently masquerade as either a pass or a fail.
    if temp_checked and not temp_found:
        category = "Missing QC label"
        verdict = "missing"
        recommended_action = "Quarantine & Escalate"
        confidence = 0.98
        fraud_score = 70
        reason_note = (
            f"MISSING QC LABEL: Golden reference shows {temp_score:.0%} template match in expected location, "
            f"but defective image has blank region. Template score: {temp_score:.2f}. "
            f"QC/security sticker appears to be removed or missing."
        )
        logger.info(f"[Agent 4] Decision: MISSING QC LABEL → Quarantine. Fraud Score: {fraud_score}")

    # 2. OCR UNREADABLE → label is physically present (template matched) and we
    # expected serial text, but OCR could not read ANY text off it. This is
    # different from a MISMATCH (wrong text) — it means the check is inconclusive,
    # not confirmed clean, so it must not fall through to "clean" by default.
    elif temp_found and expected_text and not detected_text.strip() and ensemble_results.get("ocr_engine_available", True):
        category = "OCR unreadable (needs review)"
        verdict = "missing"
        recommended_action = "Request Additional Angle"
        confidence = 0.35
        fraud_score = 25
        reason_note = (
            f"OCR UNREADABLE: Label/template region was located (template score: {temp_score:.2f}), "
            f"but zero text could be extracted during OCR, even after full-frame fallback. Expected serial: "
            f"'{expected_text}'. This is INCONCLUSIVE, not confirmed clean — most likely caused by a "
            f"mis-cropped label ROI, low resolution, or glare, rather than actual tampering. "
            f"Recommending a re-capture / additional angle before this case can be marked clean."
        )
        logger.info(f"[Agent 4] Decision: OCR UNREADABLE → Request Additional Angle. Fraud Score: {fraud_score}")

    # 3. TAMPERED / SWAP DETECTION → Keypoints don't match (different component)
    elif strong_swap_evidence and not strong_identity_match:
        category = "Swap detection"
        verdict = "tampered"
        recommended_action = "Quarantine & Escalate"
        confidence = 0.95
        fraud_score = 75
        reason_note = (
            f"SWAP DETECTION: Keypoint mismatch (match rate={kp_ratio:.2f}) suggests a DIFFERENT COMPONENT is installed. "
            f"Only {kp_ratio:.1%} of visual features match the golden reference. "
            f"This indicates the part has been swapped with a non-OEM component."
        )
        logger.info(f"[Agent 4] Decision: SWAP DETECTION → Quarantine. Fraud Score: {fraud_score}")

    # 4. ALTERED SERIAL NUMBER → OCR mismatch detected
    elif mentions_missing_component and strong_identity_match and localized_structural_issue:
        category = "Localized missing component"
        verdict = "missing"
        recommended_action = "Quarantine & Escalate"
        confidence = 0.82
        fraud_score = 58
        reason_note = (
            f"LOCALIZED MISSING COMPONENT: Board identity remains consistent (SSIM={ssim:.2f}, vector match={vec_match:.1f}%), "
            f"but localized anomaly evidence indicates a possible absent part rather than a full board swap. "
            f"Keypoint agreement is {kp_ratio:.1%}, which is treated as alignment/local difference evidence, not standalone swap proof."
        )
        logger.info(f"[Agent 4] Decision: LOCALIZED MISSING COMPONENT -> Quarantine. Fraud Score: {fraud_score}")

    elif has_low_confidence_ocr_noise:
        category = "OCR noise on label (needs review)"
        verdict = "missing"
        recommended_action = "Request Additional Angle"
        confidence = 0.30
        fraud_score = 15
        reason_note = (
            f"OCR NOISE (LOW CONFIDENCE): Detected '{detected_text}' vs. golden-image read '{expected_text}' "
            f"differ only in visually confusable characters (e.g. 0/O, 1/I/|), and the expected text was not "
            f"sourced from a catalog value. This pattern matches OCR misread noise, not confirmed tampering. "
            f"Recommending a cleaner-angle retake before ruling on the serial field."
        )
        logger.info(f"[Agent 4] Decision: OCR NOISE (confusable-only, non-catalog) → Request Additional Angle. Fraud Score: {fraud_score}")

    elif has_ocr_mismatch:
        category = "Altered serial number"
        verdict = "mismatched"
        recommended_action = "Escalate with evidence"
        confidence = 0.95
        fraud_score = 50
        # Build character-level diff description
        mismatch_details = "; ".join(
            [f"pos {m['position']}: expected '{m['expected']}' got '{m['detected']}'" for m in ocr_mismatches[:5]]
        )
        reason_note = (
            f"ALTERED SERIAL NUMBER: OCR text mismatch detected ({ocr_mismatch_count} character differences). "
            f"Expected: '{expected_text}', Detected: '{detected_text}'. "
            f"Character-level diffs: [{mismatch_details}]. "
            f"Likely tampered with alphanumeric alterations (e.g., '0'→'O', '1'→'I')."
        )
        logger.info(f"[Agent 4] Decision: ALTERED SERIAL NUMBER → Escalate. Fraud Score: {fraud_score}")

    # 5. NON-OEM LABEL → Color histogram mismatch despite correct text
    elif color_loss > 0.35:
        category = "Non-OEM label"
        verdict = "mismatched"
        recommended_action = "Escalate to vendor"
        confidence = 0.85
        fraud_score = 40
        reason_note = (
            f"NON-OEM LABEL: Color histogram similarity ({color_sim:.2f}) indicates "
            f"label hue/font/material differs from golden reference. "
            f"Despite correct serial number format, the label stock or printing process is non-original."
        )
        logger.info(f"[Agent 4] Decision: NON-OEM LABEL → Escalate to vendor. Fraud Score: {fraud_score}")

    # 6. REUSED BOARD → SSIM structural diff with good keypoints (layout matches but wear visible)
    # Only trust this when images are actually pixel-registered — see alignment_reliable note above.
    elif alignment_reliable and ssim_loss > 0.15:  # SSIM < 0.85
        category = "Reused board"
        verdict = "reused"
        recommended_action = "Request Additional Angle"
        confidence = 0.80
        fraud_score = 35
        reason_note = (
            f"REUSED BOARD: Layout structure matches golden (keypoints={kp_ratio:.2f}) but "
            f"SSIM score ({ssim:.2f}) detects surface wear, residue, or minor physical differences. "
            f"This suggests the component was previously used and returned as new."
        )
        logger.info(f"[Agent 4] Decision: REUSED BOARD → Request additional angle. Fraud Score: {fraud_score}")

    # 7. ALIGNMENT UNRELIABLE → homography didn't converge; SSIM/keypoint evidence
    # is not trustworthy here, and none of the ROI-based checks above (OCR,
    # template, color) fired either. This is inconclusive, not clean — request
    # a cleaner angle rather than silently accepting or guessing at pose noise.
    elif not alignment_reliable:
        category = "Alignment unreliable (needs retake)"
        verdict = "reused"
        recommended_action = "Request Additional Angle"
        confidence = 0.30
        fraud_score = 20
        reason_note = (
            f"ALIGNMENT UNRELIABLE: Geometric registration between the captured scan and golden reference "
            f"did not converge, so SSIM ({ssim:.2f}) and keypoint ratio ({kp_ratio:.2f}) are not trustworthy "
            f"fraud signals here — they mostly reflect pose/perspective difference. OCR, template, and color "
            f"checks did not independently flag an issue. Recommending a straighter, closer-angle retake "
            f"before a structural verdict can be trusted."
        )
        logger.info(f"[Agent 4] Decision: ALIGNMENT UNRELIABLE → Request additional angle. Fraud Score: {fraud_score}")

    # 8. FALSE ALARM / LIGHTING ISSUE → SSIM below target but no other indicators
    # (only meaningful on a reliable alignment; unreliable case is handled above)
    elif alignment_reliable and ssim < ssim_target:
        category = "False alarm (lighting)"
        verdict = "clean"
        recommended_action = "Triage Agent requests retake"
        confidence = 0.60
        fraud_score = 15
        reason_note = (
            f"FALSE ALARM (LIGHTING): SSIM score ({ssim:.2f}) is below threshold ({ssim_target:.2f}) "
            f"but no other fraud indicators detected (OCR={ocr_sim:.2f}, keypoints={kp_ratio:.2f}). "
            f"Anomaly hotspots likely caused by lighting/exposure differences, not actual tampering. "
            f"Recommending retake with improved lighting for confirmation."
        )
        logger.info(f"[Agent 4] Decision: FALSE ALARM (lighting) → Retake requested. Fraud Score: {fraud_score}")

    # 9. AMBIGUOUS CASE → no deterministic detector fired strongly enough to
    # pick a category (we're still sitting on the "clean" default), but the
    # Vision LLM's free-text description mentions a concrete fraud finding.
    # Use its wording to steer category selection instead of defaulting to
    # clean just because the numeric thresholds were borderline/inconclusive.
    # This never *overrides* a verdict a deterministic rule already reached
    # above — it only fills in when nothing else claimed the case.
    is_strongly_clean = (ssim >= 0.90 and kp_ratio >= 0.85 and ocr_sim >= 0.95 and temp_found and color_sim >= 0.90)
    if verdict == "clean" and multimodal_report and not source_reference_identical and not is_strongly_clean:
        mm_category, mm_verdict, mm_action, mm_score, mm_confidence = _classify_multimodal_keywords(multimodal_report)
        if mm_verdict is not None:
            category = mm_category
            verdict = mm_verdict
            recommended_action = mm_action
            fraud_score = mm_score
            confidence = mm_confidence
            reason_note = (
                f"AMBIGUOUS CASE RESOLVED BY VISUAL AI: Deterministic detectors (SSIM={ssim:.2f}, OCR sim={ocr_sim:.2f}, "
                f"keypoints={kp_ratio:.2f}, template found={temp_found}, color sim={color_sim:.2f}) did not clearly "
                f"trip any single rule. The Vision LLM's semantic description of the image was used to classify this "
                f"as '{category}'. Vision AI note: \"{multimodal_report[:250]}\". Flagged for human confirmation "
                f"given this verdict rests on semantic description rather than a deterministic metric."
            )
            logger.info(f"[Agent 4] Decision: AMBIGUOUS → resolved via multimodal keywords as {category}. Fraud Score: {fraud_score}")

    # --- MULTIMODAL VISION INTEGRATION ---
    # Note: multimodal_report was already read at the top of this function (for
    # mentions_missing_component). We reuse that same variable here — no second
    # .get() call, which previously overwrote the first read with the same value
    # but created a confusing double-read code path.
    if multimodal_report and "visual comparison failed" not in multimodal_lower and "visual comparison skipped" not in multimodal_lower:
        if "no anomalies detected" in multimodal_report.lower():
            logger.info("[Agent 4] Multimodal Vision confirmed: No anomalies.")
            if verdict == "clean":
                confidence = min(1.0, confidence + 0.08)
                fraud_score = max(0, fraud_score - 5)
        else:
            logger.info(f"[Agent 4] Multimodal Vision flagged: {multimodal_report[:100]}...")
            if verdict == "clean":
                reason_note += f" Visual AI noted possible differences, but deterministic detectors did not corroborate them: {multimodal_report[:200]}"
            else:
                fraud_score = min(100, fraud_score + 5)
                reason_note += f" Visual AI supporting note: {multimodal_report[:200]}"

    # --- COMPUTE WEIGHTED FRAUD SCORE (if not already set by specific verdict) ---
    if verdict in ("clean", "reused") and not source_reference_identical:
        if alignment_reliable:
            weighted_score = (ssim_loss * 35) + (ocr_loss * 20) + (vec_loss * 15) + (min(kp_loss, 1.0) * 15) + (template_loss * 10) + (color_loss * 5)
        else:
            # SSIM (35) and keypoint (15) weight is untrustworthy on an unaligned
            # pair — redistribute it to the ROI-based signals (OCR, template,
            # color) that don't depend on global geometric registration, rather
            # than silently dropping 50% of the weighting.
            weighted_score = (ocr_loss * 40) + (vec_loss * 25) + (template_loss * 25) + (color_loss * 10)
        calc_fraud = int(min(max(weighted_score * 1.5, 0.0), 100.0))
        # Use the higher of calculated score vs verdict-based score
        if verdict == "reused":
            fraud_score = max(fraud_score, calc_fraud)
        elif verdict == "clean" and calc_fraud > 10:
            fraud_score = calc_fraud
            if fraud_score > 30:
                # Even clean needs some attention if fraud score creeps up
                reason_note += f" (calculated risk score: {fraud_score})"
    elif verdict in ("tampered", "missing") and category != "OCR unreadable (needs review)":
        # For severe, confirmed verdicts, floor the score. Explicitly excluded:
        # "OCR unreadable" is inconclusive-not-confirmed by design (see its
        # branch above) — flooring it to 60 would silently override its own
        # deliberately low score/confidence and contradict the reasoning text.
        fraud_score = max(fraud_score, 60)

    # Ensure fraud score is within bounds
    fraud_score = int(min(max(fraud_score, 0), 100))

    # Borderline confidence triggers human review
    if 40 <= fraud_score <= 70:
        confidence = min(confidence, 0.45)
        reason_note += " [BORDERLINE: Fraud score 40-70 range → Human review recommended.]"

    if anomaly_regions:
        region_bits = [
            f"{r.get('location', 'unknown')} x={r.get('x')} y={r.get('y')} w={r.get('w')} h={r.get('h')}"
            for r in anomaly_regions[:3]
        ]
        reason_note += f" Evidence regions: {'; '.join(region_bits)}."

    if recommended_action not in VALID_ACTIONS:
        logger.warning(f"[Agent 4] Invalid recommended action '{recommended_action}'. Falling back to Quarantine & Escalate.")
        recommended_action = "Quarantine & Escalate"

    logger.info(f"[Agent 4] FINAL DECISION: Verdict={verdict.upper()}, Score={fraud_score}/100, Confidence={confidence:.2f}, Action={recommended_action}")

    return {
        "fraud_score": fraud_score,
        "verdict": verdict,
        "category": category,
        "confidence": confidence,
        "recommended_action": recommended_action,
        "reasoning": reason_note,
    }


def fuse_multi_angle_decisions(angle_results: list[dict]) -> dict:
    """
    Multi-Angle Fusion Engine (Bonus Challenge):
    Combines evaluation results from 2-3 camera angles (e.g., top, side, perspective)
    of the same part to calculate a fused fraud score and higher decision confidence.
    """
    if not angle_results:
        return {
            "fused_fraud_score": 0,
            "fused_verdict": "clean",
            "fused_confidence": 0.0,
            "fused_action": "Accept",
            "fusion_summary": "No multi-angle inspection evidence provided.",
            "angles_analyzed": []
        }

    if len(angle_results) == 1:
        single = angle_results[0]
        return {
            "fused_fraud_score": single.get("fraud_score", 0),
            "fused_verdict": single.get("verdict", "clean"),
            "fused_confidence": single.get("confidence", 0.90),
            "fused_action": single.get("recommended_action", "Accept"),
            "fusion_summary": f"Single angle analysis ({single.get('angle', 'top')}).",
            "angles_analyzed": [single.get("angle", "top")]
        }

    logger.info(f"[Agent 4] Running Multi-Angle Fusion on {len(angle_results)} inspection angles...")
    
    angles_analyzed = [item.get("angle", f"angle_{idx+1}") for idx, item in enumerate(angle_results)]
    scores = [float(item.get("fraud_score", 0)) for item in angle_results]
    confidences = [float(item.get("confidence", 0.5)) for item in angle_results]
    verdicts = [item.get("verdict", "clean").lower() for item in angle_results]
    actions = [item.get("recommended_action", "Accept") for item in angle_results]

    # 1. Probabilistic Noisy-OR Fusion for Fraud Score
    prod_clean = 1.0
    for s in scores:
        prod_clean *= (1.0 - (min(max(s, 0.0), 100.0) / 100.0))
    
    fused_score = int(round((1.0 - prod_clean) * 100.0))
    fused_score = min(max(fused_score, int(max(scores))), 100)

    # 2. Priority Hierarchy for Fused Verdict
    verdict_priority = {"tampered": 5, "missing": 4, "mismatched": 3, "reused": 2, "clean": 1}
    sorted_by_severity = sorted(angle_results, key=lambda x: verdict_priority.get(x.get("verdict", "clean").lower(), 1), reverse=True)
    fused_verdict = sorted_by_severity[0].get("verdict", "clean")

    # 3. Action Assignment
    action_priority = {"Quarantine & Escalate": 4, "Request Vendor Verification": 3, "Request Additional Angle": 2, "Accept": 1}
    sorted_by_action = sorted(angle_results, key=lambda x: action_priority.get(x.get("recommended_action", "Accept"), 1), reverse=True)
    fused_action = sorted_by_action[0].get("recommended_action", "Accept")

    # 4. Agreement Multiplier for Fused Confidence
    matching_verdicts_count = sum(1 for v in verdicts if v == fused_verdict)
    base_confidence = max(confidences)
    confidence_boost = (matching_verdicts_count - 1) * 0.05
    fused_confidence = round(min(1.0, base_confidence + confidence_boost), 2)

    # 5. Build Fusion Summary
    angle_details_str = ", ".join([f"{a.get('angle', 'unknown')}: score {a.get('fraud_score')}/100 ({a.get('verdict')})" for a in angle_results])
    fusion_summary = (
        f"Multi-Angle Fusion completed across {len(angle_results)} views ({', '.join(angles_analyzed)}). "
        f"Individual results: [{angle_details_str}]. "
        f"Cross-angle evidence agreement elevates combined fraud confidence to {fused_confidence * 100:.0f}% with a fused risk score of {fused_score}/100."
    )

    logger.info(f"[Agent 4] Multi-Angle Fusion Result: Fused Score={fused_score}, Verdict={fused_verdict.upper()}, Confidence={fused_confidence}")

    return {
        "fused_fraud_score": fused_score,
        "fused_verdict": fused_verdict,
        "fused_confidence": fused_confidence,
        "fused_action": fused_action,
        "fusion_summary": fusion_summary,
        "angles_analyzed": angles_analyzed
    }