import os
import cv2
import numpy as np
import logging
from typing import TypedDict, Dict, Any, Optional, List
from langgraph.graph import StateGraph, END

from app import services
from app.config import settings

logger = logging.getLogger(__name__)

class InspectionState(TypedDict):
    # Inputs
    case_id: str
    image_path: str
    golden_path: str
    expected_serial: Optional[str]
    roi_config: Optional[dict]
    commodity: Optional[str]
    
    # Ingestion/Triage results
    triage_status: str          # "pass" or "fail"
    triage_detail: str          # detail messages
    blur_score: float
    brightness_score: float
    alignment_rate: float
    aligned_image: Optional[np.ndarray]  # numpy array of aligned image
    
    # Anomaly detection results
    ssim_score: Optional[float]
    ocr_detected_text: Optional[str]
    ocr_expected_text: Optional[str]
    ocr_similarity: Optional[float]
    ocr_mismatches: Optional[List[dict]]
    keypoint_ratio: Optional[float]
    template_match_score: Optional[float]
    template_match_found: Optional[bool]
    color_hist_similarity: Optional[float]
    vector_embedding_match: Optional[float]
    anomaly_regions: Optional[List[dict]]
    detector_results: Optional[dict]
    ocr_diff: Optional[dict]
    thresholds_used: Optional[dict]
    evidence_summary: Optional[dict]
    alignment_status: Optional[str]
    source_reference_identical: bool
    heatmap_path: Optional[str]
    diagnostic_path: Optional[str]
    multimodal_report: Optional[str]
    
    # Decision/Policy results
    fraud_score: Optional[int]
    verdict: Optional[str]
    category: Optional[str]
    confidence: Optional[float]
    recommended_action: Optional[str]
    explanation: Optional[str]
    decision_reasoning: Optional[str]  # Agent 4 reasoning; kept separate so triage_detail retains quality info
    
    # Final workflow state
    status: str                 # "completed", "retake_needed", "failed"

# 1. Triage Agent Node
def triage_node(state: InspectionState) -> Dict[str, Any]:
    """
    Validates image quality (blur, lighting) and performs geometric alignment.
    """
    case_id = state["case_id"]
    logger.info("\n" + "="*80 + f"\n🚀 [START] NODE: triage (Agent 2: Triage & Aligner) - Case {case_id}\n" + "="*80)
    
    image_path = state["image_path"]
    golden_path = state["golden_path"]
    
    triage_result = services.process_and_validate(image_path, golden_path)
    
    if triage_result["status"] in {"fail", "retake_needed", "failed"}:
        logger.warning(f"❌ [Node: Triage] Validation failed for Case {case_id}: {triage_result['detail']}")
        logger.info("\n" + "="*80 + f"\n⏹️ [FINISHED] NODE: triage (FAILED) - Case {case_id}\n" + "="*80)
        workflow_status = "retake_needed" if triage_result["status"] in {"fail", "retake_needed"} else "failed"
        return {
            "triage_status": "fail",
            "triage_detail": triage_result["detail"],
            "blur_score": triage_result.get("blur_score", 0.0),
            "brightness_score": triage_result.get("brightness_score", 0.0),
            "alignment_status": triage_result.get("alignment_status", "not_run"),
            "status": workflow_status
        }
    
    logger.info(f"⚙️ [Node: Triage] Clarity: {triage_result.get('blur_score'):.1f}, Brightness: {triage_result.get('brightness_score'):.1f}, Alignment matches: {triage_result.get('alignment_rate'):.3f}")
    logger.info("\n" + "="*80 + f"\n✅ [FINISHED] NODE: triage (SUCCESS) - Case {case_id}\n" + "="*80)
    return {
        "triage_status": "pass",
        "triage_detail": triage_result.get("detail", ""),
        "blur_score": triage_result.get("blur_score", 0.0),
        "brightness_score": triage_result.get("brightness_score", 0.0),
        "alignment_rate": triage_result.get("alignment_rate", 0.0),
        "aligned_image": triage_result.get("aligned_image"),
        "alignment_status": triage_result.get("alignment_status", "aligned" if triage_result.get("alignment_reliable") else "semantic_fallback"),
        "status": "processing"
    }

# 2. Reference Selection Node
def select_reference_node(state: InspectionState) -> Dict[str, Any]:
    """
    Checks if the uploaded golden reference standard and target scan images are fit for comparison.
    """
    case_id = state["case_id"]
    logger.info("\n" + "="*80 + f"\n🚀 [START] NODE: select_reference (Agent 1: Selector / Gatekeeper) - Case {case_id}\n" + "="*80)
    
    viability_result = services.verify_comparison_viability(state["image_path"], state["golden_path"])
    
    if not viability_result["viable"]:
        logger.warning(f"❌ [Node: Ref Selector] Viability check failed for Case {case_id}: {viability_result['detail']}")
        logger.info("\n" + "="*80 + f"\n⏹️ [FINISHED] NODE: select_reference (FAILED) - Case {case_id}\n" + "="*80)
        return {
            "status": "failed",
            "triage_detail": viability_result["detail"]
        }
        
    logger.info(f"🏷️ [Node: Ref Selector] Dynamic part classification loaded: '{state.get('commodity')}'")
    logger.info("\n" + "="*80 + f"\n✅ [FINISHED] NODE: select_reference (SUCCESS) - Case {case_id}\n" + "="*80)
    return {"triage_detail": viability_result.get("detail", "")}


# 3. Anomaly Detection Ensemble Node
def detect_anomalies_node(state: InspectionState) -> Dict[str, Any]:
    """
    Runs the vision detection suite (SSIM difference, EasyOCR string checking, Keypoint counts).
    """
    case_id = state["case_id"]
    logger.info("\n" + "="*80 + f"\n🚀 [START] NODE: detect_anomalies (Agent 3: Vision-AI Hybrid Inspector) - Case {case_id}\n" + "="*80)
    if state.get("status") == "failed" or state.get("triage_status") == "fail":
        logger.warning(f"⚠️ [Node: Anomaly Ensemble] Skipping anomaly detection because previous step failed for Case {case_id}")
        logger.info("\n" + "="*80 + f"\n⏹️ [FINISHED] NODE: detect_anomalies (SKIPPED) - Case {case_id}\n" + "="*80)
        return {}

    aligned_img = state.get("aligned_image")
    if aligned_img is None:
        logger.error(f"\u274c [Node: Anomaly Ensemble] aligned_image is None for Case {case_id} — cannot run detection ensemble.")
        logger.info("\n" + "="*80 + f"\n\u23f9\ufe0f [FINISHED] NODE: detect_anomalies (FAILED — no aligned image) - Case {case_id}\n" + "="*80)
        return {
            "status": "failed",
            "triage_detail": "Aligned image unavailable. The scan could not be registered against the golden reference. Please retake."
        }
    ref_img = cv2.imread(state["golden_path"])
    
    if ref_img is None:
        logger.error(f"❌ [Node: Anomaly Ensemble] Unable to load golden reference image from disk for Case {case_id}")
        logger.info("\n" + "="*80 + f"\n⏹️ [FINISHED] NODE: detect_anomalies (FAILED) - Case {case_id}\n" + "="*80)
        return {
            "status": "failed",
            "triage_detail": "Could not read golden reference image during detection stage."
        }
        
    roi_config = {
        "label_roi": state["roi_config"].get("label_roi") if state["roi_config"] else None,
        "expected_serial": state["expected_serial"],
        "template_roi": state["roi_config"].get("template_roi") if state["roi_config"] else None,
        "color_roi": state["roi_config"].get("color_roi") if state["roi_config"] else None
    }
    
    # Keep a direct, pre-alignment comparison as the ground truth for an
    # identical upload.  A homography/illumination pass may introduce small
    # interpolation changes, and OCR can misread a perfectly valid label.
    # Neither is evidence of fraud when the decoded upload is exactly the
    # golden reference.
    original_img = cv2.imread(state["image_path"])
    source_reference_identical = bool(
        original_img is not None
        and original_img.shape == ref_img.shape
        and np.array_equal(original_img, ref_img)
    )

    commodity = state.get("commodity", "motherboard")
    ensemble_results = services.run_anomaly_ensemble(
        aligned_img,
        ref_img,
        roi_config,
        src_image_path=state["image_path"],
        ref_image_path=state["golden_path"],
        commodity=commodity
    )
    ensemble_results["source_reference_identical"] = source_reference_identical
    
    # Save the heatmap image to disk inside this node
    file_ext = os.path.splitext(state["image_path"])[1]
    heatmap_name = f"{case_id}_heatmap{file_ext}"
    heatmap_path = os.path.join(settings.UPLOAD_DIR, heatmap_name)
    
    logger.info(f"[Node: Anomaly Ensemble] Saving annotated anomaly heatmap image to {heatmap_path}")
    try:
        cv2.imwrite(heatmap_path, ensemble_results["heatmap_img"])
    except Exception as e:
        logger.error(f"❌ [Node: Anomaly Ensemble] Failed to save heatmap image for Case {case_id}: {e}")
        heatmap_path = None

    # Save the annotated target scan image (with defect bounding boxes & labels)
    if ensemble_results.get("annotated_target") is not None:
        annotated_name = f"{case_id}_annotated{file_ext}"
        annotated_path = os.path.join(settings.UPLOAD_DIR, annotated_name)
        logger.info(f"[Node: Anomaly Ensemble] Saving annotated target scan image to {annotated_path}")
        try:
            cv2.imwrite(annotated_path, ensemble_results["annotated_target"])
        except Exception as e:
            logger.error(f"❌ [Node: Anomaly Ensemble] Failed to save annotated target scan: {e}")

    # Also save the dynamic diagnostic card to a separate file (for audits/reports)
    diag_path = None
    if ensemble_results.get("diagnostic_card") is not None:
        diag_name = f"{case_id}_diagnostic{file_ext}"
        diag_path = os.path.join(settings.UPLOAD_DIR, diag_name)
        logger.info(f"[Node: Anomaly Ensemble] Saving side-by-side diagnostic card to {diag_path}")
        try:
            cv2.imwrite(diag_path, ensemble_results["diagnostic_card"])
        except Exception as e:
            logger.error(f"❌ [Node: Anomaly Ensemble] Failed to save diagnostic card: {e}")
        
    logger.info(f"⚙️ [Node: Anomaly Ensemble] Checks complete. SSIM: {ensemble_results['ssim_score']:.3f}, Keypoint Match: {ensemble_results['keypoint_ratio']:.3f}, Template status: {ensemble_results.get('template_match_found')}, Color corr: {ensemble_results.get('color_hist_similarity'):.3f}")
    logger.info("\n" + "="*80 + f"\n✅ [FINISHED] NODE: detect_anomalies (SUCCESS) - Case {case_id}\n" + "="*80)
    return {
        "ssim_score": ensemble_results["ssim_score"],
        "ocr_detected_text": ensemble_results["detected_text"],
        "ocr_expected_text": ensemble_results.get("expected_text") or state["expected_serial"],
        "ocr_similarity": ensemble_results["ocr_similarity"],
        "ocr_mismatches": ensemble_results["ocr_mismatches"],
        "ocr_diff": ensemble_results.get("ocr_diff"),
        "keypoint_ratio": ensemble_results["keypoint_ratio"],
        "template_match_score": ensemble_results.get("template_match_score", 1.0),
        "template_match_found": ensemble_results.get("template_match_found", True),
        "color_hist_similarity": ensemble_results.get("color_hist_similarity", 1.0),
        "vector_embedding_match": ensemble_results.get("vector_embedding_match"),
        "anomaly_regions": ensemble_results.get("anomaly_regions", []),
        "detector_results": ensemble_results.get("detector_results", {}),
        "evidence_summary": ensemble_results.get("evidence_summary", {}),
        "thresholds_used": ensemble_results.get("thresholds_used", {}),
        "source_reference_identical": source_reference_identical,
        "heatmap_path": heatmap_path,
        "diagnostic_path": diag_path,
        "multimodal_report": ensemble_results.get("multimodal_report", "No visual report generated.")
    }

# 4. Policy & Decision Node
def decision_node(state: InspectionState) -> Dict[str, Any]:
    """
    Evaluates detectors output to compute final fraud score, verdict, confidence, and recommended action.
    """
    case_id = state["case_id"]
    logger.info("\n" + "="*80 + f"\n🚀 [START] NODE: decision (Agent 4: Decision Judge) - Case {case_id}\n" + "="*80)
    if state.get("status") == "failed" or state.get("triage_status") == "fail":
        logger.warning(f"⚠️ [Node: Decision Judge] Skipping decision judging because previous step failed for Case {case_id}")
        logger.info("\n" + "="*80 + f"\n⏹️ [FINISHED] NODE: decision (SKIPPED) - Case {case_id}\n" + "="*80)
        return {}

    ensemble_results = {
        "ssim_score": state["ssim_score"],
        "ocr_similarity": state["ocr_similarity"],
        "ocr_mismatches": state["ocr_mismatches"],
        "ocr_diff": state.get("ocr_diff"),
        "keypoint_ratio": state["keypoint_ratio"],
        "expected_text": state.get("ocr_expected_text") or state["expected_serial"],
        "detected_text": state["ocr_detected_text"],
        "template_match_score": state.get("template_match_score", 1.0),
        "template_match_found": state.get("template_match_found", True),
        "color_hist_similarity": state.get("color_hist_similarity", 1.0),
        "vector_embedding_match": state.get("vector_embedding_match"),
        "anomaly_regions": state.get("anomaly_regions", []),
        "detector_results": state.get("detector_results", {}),
        "evidence_summary": state.get("evidence_summary", {}),
        "thresholds_used": state.get("thresholds_used", {}),
        "source_reference_identical": state.get("source_reference_identical", False),
        "multimodal_report": state.get("multimodal_report", ""),
        # alignment_status is set by triage_node to "aligned" only when Agent 2's
        # homography actually converged (see agent_2_triage.align_images). Any
        # other value ("semantic_fallback", "not_run", etc.) means SSIM/keypoint
        # evidence is on an unregistered image pair — Agent 4 needs this to
        # avoid treating pose difference as fraud evidence.
        "alignment_reliable": state.get("alignment_status") == "aligned",
    }
    
    # Read thresholds from settings as a baseline so they are always populated,
    # then overlay any runtime-adjusted values from the admin triage config.
    # NOTE: importing from a router module is a dependency-direction violation
    # (services should not import from routers). The try/except ensures the
    # pipeline still works in tests and CLI contexts where triage.py is not
    # imported, and settings values are always used as the safe fallback.
    thresholds = {
        "ssim": float(getattr(settings, "SSIM_THRESHOLD", 0.85)),
        "ocrFuzzyPct": 100,
    }
    try:
        from app.routers.triage import _PIPELINE_CONFIG
        runtime_thresholds = _PIPELINE_CONFIG.get("thresholds", {})
        if runtime_thresholds:
            thresholds.update(runtime_thresholds)
    except Exception as e:
        logger.warning(f"[Node: Decision Judge] Could not load live threshold config, using settings defaults: {e}")

    decision = services.make_decision(ensemble_results, thresholds=thresholds)
    logger.info(f"⚖️ [Node: Decision Judge] Verdict: {decision['verdict'].upper()}, Score: {decision['fraud_score']}/100, Action: {decision['recommended_action']}")
    logger.info("\n" + "="*80 + f"\n✅ [FINISHED] NODE: decision (SUCCESS) - Case {case_id}\n" + "="*80)
    
    return {
        "fraud_score": decision["fraud_score"],
        "verdict": decision["verdict"],
        "category": decision.get("category"),
        "confidence": decision["confidence"],
        "recommended_action": decision["recommended_action"],
        "decision_reasoning": decision["reasoning"],
    }

# 5. Explainer Agent Node
def explainer_node(state: InspectionState) -> Dict[str, Any]:
    """
    Generates natural language explanation for findings.
    """
    case_id = state["case_id"]
    logger.info("\n" + "="*80 + f"\n🚀 [START] NODE: explainer (Agent 5: LLM Explainer) - Case {case_id}\n" + "="*80)
    if state.get("status") == "failed" or state.get("triage_status") == "fail":
        logger.warning(f"⚠️ [Node: Explainer Agent] Skipping explanation generation because previous step failed for Case {case_id}")
        logger.info("\n" + "="*80 + f"\n⏹️ [FINISHED] NODE: explainer (SKIPPED) - Case {case_id}\n" + "="*80)
        return {}

    metrics_for_explain = {
        "ssim_score": state["ssim_score"],
        "verdict": state["verdict"],
        "fraud_score": state["fraud_score"],
        "detected_text": state["ocr_detected_text"],
        "expected_text": state.get("ocr_expected_text") or state["expected_serial"],
        "ocr_mismatches": state["ocr_mismatches"],
        "ocr_diff": state.get("ocr_diff"),
        "recommended_action": state["recommended_action"],
        "template_match_score": state.get("template_match_score", 1.0),
        "template_match_found": state.get("template_match_found", True),
        "color_hist_similarity": state.get("color_hist_similarity", 1.0),
        "keypoint_ratio": state.get("keypoint_ratio"),
        "anomaly_regions": state.get("anomaly_regions", []),
        "detector_results": state.get("detector_results", {}),
        "evidence_summary": state.get("evidence_summary", {}),
        "thresholds_used": state.get("thresholds_used", {}),
        "alignment_status": state.get("alignment_status"),
        # Use decision_reasoning (set by decision_node) as the grounding context
        # for the LLM explainer. Fall back to triage_detail (image quality message)
        # only if decision_reasoning is not available.
        "reasoning": state.get("decision_reasoning") or state.get("triage_detail", ""),
        "multimodal_report": state.get("multimodal_report", "")
    }
    
    explanation = services.generate_explanation(metrics_for_explain)
    logger.info(f"📝 [Node: Explainer Agent] Generated narrative: {explanation[:120]}...")
    logger.info("\n" + "="*80 + f"\n✅ [FINISHED] NODE: explainer (SUCCESS) - Case {case_id}\n" + "="*80)
    
    return {
        "explanation": explanation,
        "status": "completed"
    }

# Conditional Routing Functions
def check_gatekeeper_condition(state: InspectionState) -> str:
    """
    Checks if the comparison viability gatekeeper check failed.
    """
    if state.get("status") == "failed":
        logger.warning(f"[Routing: Gatekeeper Fail] Bypassing pipeline directly to End due to comparison viability rejection.")
        return "fail"
    logger.info(f"[Routing: Gatekeeper Pass] Routing flow to Triage & Aligner node.")
    return "continue"


def check_triage_condition(state: InspectionState) -> str:
    """
    Checks if triage has failed or if the aligned image is unavailable.
    """
    if state.get("triage_status") == "fail" or state.get("status") == "retake_needed":
        logger.warning(f"[Routing: Triage Fail] Bypassing pipeline directly to End due to Ingestion Quality/Alignment rejection.")
        return "fail"
    # Guard: aligned_image must be populated. A triage can 'pass' quality checks
    # but still fail to produce an aligned image (e.g. if cv2.imread returned None
    # for the source file). Catch it here before the detection node crashes.
    if state.get("aligned_image") is None:
        logger.warning("[Routing: Triage Fail] aligned_image is None despite triage passing — routing to fail.")
        return "fail"
    logger.info(f"[Routing: Triage Pass] Routing flow to Anomaly Detector Ensemble.")
    return "continue"


# Build the LangGraph StateGraph workflow
workflow = StateGraph(InspectionState)

# Add all agent/service nodes
workflow.add_node("triage", triage_node)
workflow.add_node("select_reference", select_reference_node)
workflow.add_node("detect_anomalies", detect_anomalies_node)
workflow.add_node("decision", decision_node)
workflow.add_node("explainer", explainer_node)

# Define execution flow edges
workflow.set_entry_point("select_reference")

# Gatekeeper conditional routing
workflow.add_conditional_edges(
    "select_reference",
    check_gatekeeper_condition,
    {
        "fail": END,
        "continue": "triage"
    }
)

# Triage conditional routing
workflow.add_conditional_edges(
    "triage",
    check_triage_condition,
    {
        "fail": END,
        "continue": "detect_anomalies"
    }
)

workflow.add_edge("detect_anomalies", "decision")
workflow.add_edge("decision", "explainer")
workflow.add_edge("explainer", END)


# Compile graph
app_workflow = workflow.compile()

def run_inspection_pipeline(initial_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Helper function to run the compiled StateGraph with initial parameters.
    Measures and logs total end-to-end pipeline execution latency in milliseconds.
    """
    import time
    t_start = time.time()

    state_input = {
        "case_id": initial_state["case_id"],
        "image_path": initial_state["image_path"],
        "golden_path": initial_state["golden_path"],
        "expected_serial": initial_state.get("expected_serial"),
        "roi_config": initial_state.get("roi_config"),
        "commodity": initial_state.get("commodity", "motherboard"),
        "triage_status": "pass",
        "triage_detail": "",
        "blur_score": 0.0,
        "brightness_score": 0.0,
        "alignment_rate": 0.0,
        "aligned_image": None,
        "ssim_score": None,
        "ocr_detected_text": None,
        "ocr_expected_text": None,
        "ocr_similarity": None,
        "ocr_mismatches": None,
        "keypoint_ratio": None,
        "template_match_score": None,
        "template_match_found": None,
        "color_hist_similarity": None,
        "vector_embedding_match": None,
        "anomaly_regions": [],
        "detector_results": {},
        "ocr_diff": {},
        "thresholds_used": {},
        "evidence_summary": {},
        "alignment_status": "not_run",
        "source_reference_identical": False,
        "heatmap_path": None,
        "diagnostic_path": None,
        "multimodal_report": None,
        "fraud_score": None,
        "verdict": None,
        "confidence": None,
        "recommended_action": None,
        "explanation": None,
        "decision_reasoning": None,
        "status": "pending"
    }
    
    result = app_workflow.invoke(state_input)
    t_elapsed = time.time() - t_start
    logger.info(f"\n⚡ [PERFORMANCE TELEMETRY] Total 5-Agent Pipeline Execution Time for Case {initial_state['case_id']}: {t_elapsed:.3f}s ({t_elapsed*1000:.0f} ms)\n")
    return result