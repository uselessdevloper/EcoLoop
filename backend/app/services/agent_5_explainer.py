import os
import requests
import logging
from typing import Dict
from app.config import settings

logger = logging.getLogger(__name__)

MAX_LLM_ATTEMPTS = 1


def _build_prompt(ssim, verdict, fraud_score, detected_text, expected_text,
                   ocr_mismatches, recommended_action, temp_score, temp_found,
                   color_sim, decision_reasoning, multimodal_report) -> str:
    grounding = (
        f"- Decision Agent's reasoning: \"{decision_reasoning}\"\n"
        if decision_reasoning else ""
    )
    visual_ai_finding = (
        f"- Multimodal Visual AI inspection report: \"{multimodal_report}\"\n"
        if multimodal_report and "skipped" not in multimodal_report.lower() and "failed" not in multimodal_report.lower()
        else ""
    )
    return (
        f"You are an AI Explainer Agent for an enterprise manufacturing QC audit platform.\n"
        f"A separate Decision Agent has already reached a verdict from the metrics below. Your job is ONLY to "
        f"write the audit-facing explanation for that verdict — do not re-judge or contradict it, and do not "
        f"introduce any finding, number, or detail that is not listed here.\n\n"
        f"METRICS:\n"
        f"- SSIM Structural Similarity: {ssim:.2f}\n"
        f"- Template Match Status: {'FOUND' if temp_found else 'MISS'} (Score: {temp_score:.2f}, checks label existence)\n"
        f"- Color/Material Histogram Match: {color_sim:.2f} (lower means paint/materials deviation)\n"
        f"- OCR Expected Label: '{expected_text}'\n"
        f"- OCR Detected Label: '{detected_text}'\n"
        f"- Character Mismatches: {ocr_mismatches}\n"
        f"- Fraud Score: {fraud_score}/100\n"
        f"- Verdict Category: {verdict.upper()}\n"
        f"- Recommended Action: {recommended_action}\n"
        f"{grounding}\n"
        f"{visual_ai_finding}\n"
        f"Write a detailed, fluent paragraph (6-8 sentences) that explains the inspection findings "
        f"in natural, audit-ready language. Structure it as follows:\n\n"
        f"1. Start by describing what the SSIM heatmap analysis revealed — mention specific SSIM score and "
        f"what areas of the component showed structural deviation from the golden reference.\n"
        f"2. Then describe the label verification results — what text was expected versus what was detected by OCR, "
        f"and whether character mismatches were found.\n"
        f"3. If relevant, mention template/logo presence and color/material correlation findings.\n"
        f"4. Conclude with the verdict, fraud risk score, and recommended action.\n\n"
        f"Make it sound like a senior quality auditor writing an official inspection report.\n\n"
        f"CRITICAL NATURAL LANGUAGE RULES:\n"
        f"- Write in smooth, natural, executive English.\n"
        f"- ABSOLUTELY NO raw pixel math, coordinate tuples like '(x=137, y=109)', or code variables.\n"
        f"- Describe locations in plain words (e.g., 'center sticker area', 'upper PCB chips').\n"
        f"- Do not speculate beyond the metrics provided."
    )


def generate_explanation(metrics: dict) -> str:
    """
    Generates a natural language explanation of the inspection findings.
    First tries to call the LLM (NVIDIA NIM primary) for a rich audit narrative.
    Falls back to a local template if the API key is missing or the call fails.
    """
    ssim = metrics.get("ssim_score", 1.0)
    verdict = metrics.get("verdict", "clean")
    fraud_score = metrics.get("fraud_score", 0)
    detected_text = metrics.get("detected_text", "")
    expected_text = metrics.get("expected_text", "")
    ocr_mismatches = metrics.get("ocr_mismatches", [])
    recommended_action = metrics.get("recommended_action", "Accept")
    decision_reasoning = metrics.get("reasoning", "")
    multimodal_report = metrics.get("multimodal_report", "")
    anomaly_regions = metrics.get("anomaly_regions", []) or []
    temp_score = metrics.get("template_match_score", 1.0)
    temp_found = metrics.get("template_match_found", True)
    color_sim = metrics.get("color_hist_similarity", 1.0)

    logger.info(f"Generate Explanation called for verdict={verdict.upper()}, fraud_score={fraud_score}")

    # Default to enabled when an API key is present — the env var exists only
    # as an escape hatch to force the template fallback (e.g. for offline demos).
    nim_key = getattr(settings, "NVIDIA_NIM_API_KEY", None)
    use_llm_explainer = os.getenv("ENABLE_LLM_EXPLAINER", "true").lower() == "true"

    if nim_key and use_llm_explainer:
        prompt = _build_prompt(
            ssim, verdict, fraud_score, detected_text, expected_text,
            ocr_mismatches, recommended_action, temp_score, temp_found,
            color_sim, decision_reasoning, multimodal_report,
        )

        url = f"{getattr(settings, 'NVIDIA_NIM_BASE_URL', 'https://integrate.api.nvidia.com/v1')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {nim_key}",
            "Content-Type": "application/json",
        }
        model_name = getattr(settings, "NVIDIA_TEXT_MODEL", "meta/llama-3.1-8b-instruct")
        payload = {
            "model": model_name,
            "temperature": 0.1,
            "messages": [{"role": "user", "content": prompt}],
        }

        for attempt in range(1, MAX_LLM_ATTEMPTS + 1):
            logger.info(f"Querying NVIDIA NIM Explainer model (attempt {attempt}/{MAX_LLM_ATTEMPTS}): {model_name}")
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                if response.status_code == 200:
                    res_data = response.json()
                    explanation = res_data["choices"][0]["message"]["content"].strip()
                    if explanation:
                        logger.info("NVIDIA NIM Explainer model returned response successfully.")
                        return explanation
                else:
                    logger.warning(f"NVIDIA NIM Explainer endpoint returned status {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"NVIDIA NIM Explainer LLM attempt {attempt}/{MAX_LLM_ATTEMPTS} failed: {e}")

        logger.warning("All Explainer LLM attempts exhausted. Falling back to template explainer...")

    # ── Rule-Based Fallback — Rich Bullet & Paragraph Template ──────────────
    logger.info("Assembling rule-based local explanation template...")

    ssim_pct = ssim * 100
    if anomaly_regions:
        region_text = "; ".join(
            f"the {r.get('location', 'unknown')} area of the component"
            for r in anomaly_regions[:3]
        )
    else:
        region_text = "localized defect regions"

    # --- 1. SSIM / Heatmap paragraph ---
    if ssim >= 0.85:
        heatmap_part = (
            f"SSIM heatmap analysis registered a structural similarity index of {ssim:.2f} ({ssim_pct:.0f}%), "
            f"indicating the component surface matches the golden reference within acceptable tolerances."
        )
    elif ssim >= 0.65:
        heatmap_part = (
            f"SSIM heatmap analysis recorded a structural similarity score of {ssim:.2f} ({ssim_pct:.0f}%), "
            f"which falls moderately below the ideal threshold. The heatmap overlay highlights {region_text}, "
            f"suggesting surface-level wear or localized component alterations."
        )
    else:
        heatmap_part = (
            f"SSIM heatmap analysis returned a low structural similarity index of {ssim:.2f} ({ssim_pct:.0f}%), "
            f"well below the acceptable threshold. Significant structural deviation was detected in {region_text}."
        )

    # --- 2. OCR / Label details ---
    if not expected_text:
        ocr_part = "Label text verification was not configured for this component model."
    elif expected_text and detected_text and expected_text == detected_text:
        ocr_part = f"Label OCR check confirmed exact match with golden reference text '{expected_text}'."
    elif not detected_text.strip() and expected_text:
        ocr_part = f"OCR check expected serial text '{expected_text}', but no readable text could be extracted from the label region."
    else:
        mismatches_count = len(ocr_mismatches)
        ocr_part = (
            f"OCR verification detected serial mismatch. Expected '{expected_text}', but extracted '{detected_text}' "
            f"({mismatches_count} character difference(s))."
        )

    # --- 3. Extra findings ---
    extra_parts = []
    if not temp_found:
        extra_parts.append("The manufacturer logo / QC sticker was missing from the expected layout position.")
    if color_sim < 0.80:
        extra_parts.append(f"Color histogram correlation ({color_sim:.2f}) indicates material or print color deviation.")

    # --- 4. Conclusion & Action ---
    conclusion = (
        f"Inspection complete with verdict {verdict.upper()} (Fraud Risk Score: {fraud_score}/100). "
        f"Recommended Action: '{recommended_action}'."
    )
    if decision_reasoning:
        reasoning_clause = f" Decision Judge Note: {decision_reasoning}."
    else:
        reasoning_clause = ""

    if multimodal_report and "skipped" not in multimodal_report.lower() and "failed" not in multimodal_report.lower() and "no anomalies" not in multimodal_report.lower():
        visual_clause = f" Visual AI Note: {multimodal_report}"
    else:
        visual_clause = ""

    # Assemble detailed paragraph
    all_parts = [heatmap_part, ocr_part] + extra_parts + [conclusion + reasoning_clause + visual_clause]
    detailed_paragraph = " ".join(all_parts)

    # --- Plain-English bullet summary ---
    status_map = {
        "clean": "Clean (OEM Verified)",
        "tampered": "Tampered (Component Swap)",
        "missing": "Defective (Missing Element)",
        "mismatched": "Defective (Label Mismatch)",
        "reused": "Defective (Reused/Worn)",
    }
    part_status = status_map.get(verdict, verdict.title())

    if ssim >= 0.85:
        visual_finding = "No meaningful visual differences found compared to the golden reference."
    elif ssim >= 0.65:
        visual_finding = f"Some visual differences found ({region_text})."
    else:
        visual_finding = f"Major visual differences found ({region_text})."

    if not expected_text:
        serial_check = "Not checked (no serial text configured)."
    elif expected_text and detected_text and expected_text == detected_text:
        serial_check = f"Match — expected '{expected_text}', found '{detected_text}'."
    elif not detected_text.strip():
        serial_check = f"Could not read label — expected '{expected_text}'."
    else:
        serial_check = f"Mismatch — expected '{expected_text}', found '{detected_text}' ({len(ocr_mismatches)} character diffs)."

    action_item = f"{recommended_action}."

    bullet_summary = (
        f"• Part Status: {part_status}\n"
        f"• Visual Findings: {visual_finding}\n"
        f"• Serial Check: {serial_check}\n"
        f"• Inspector Action Item: {action_item}"
    )

    explanation_msg = f"{bullet_summary}\n\n{detailed_paragraph}"
    logger.info(f"Local compiled explanation: {explanation_msg[:150]}...")
    return explanation_msg