import logging
import base64
import cv2
import os
import requests
from app.config import settings

logger = logging.getLogger(__name__)

VALID_COMMODITIES = {
    "motherboard", "label", "microchip", "processor", "ram",
    "storage", "gpu", "battery", "display", "chassis", "fan", "sensor", "other"
}


def _encode_image_b64(image_path: str, max_dim: int = 300) -> str:
    """Encode image to base64 string."""
    img = cv2.imread(image_path)
    if img is None:
        return None
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    _, buffer = cv2.imencode(".png", img)
    return base64.b64encode(buffer).decode("utf-8")


def verify_comparison_viability(src_image_path: str, ref_image_path: str) -> dict:
    """
    Agent 1: Gatekeeper.
    Checks: file integrity, aspect ratio, resolution scale, keypoint layout agreement.
    """
    logger.info(f"[Agent 1: Selector] Verifying comparison viability between: {src_image_path} and {ref_image_path}")

    if not os.path.exists(src_image_path):
        return {"viable": False, "detail": "Target captured scan image file is missing on disk."}
    if not os.path.exists(ref_image_path):
        return {"viable": False, "detail": "Golden reference standard image file is missing on disk."}

    src = cv2.imread(src_image_path)
    ref = cv2.imread(ref_image_path)

    if src is None:
        return {"viable": False, "detail": "Unable to read captured target scan image."}
    if ref is None:
        return {"viable": False, "detail": "Unable to read golden reference standard image."}

    gray_src = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
    gray_ref = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY)
    orb = cv2.ORB_create(nfeatures=500)
    kp_src, des_src = orb.detectAndCompute(gray_src, None)
    kp_ref, des_ref = orb.detectAndCompute(gray_ref, None)

    layout_warning = ""
    if des_src is not None and des_ref is not None:
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        try:
            matches = bf.match(des_src, des_ref)
            good_matches = [m for m in matches if m.distance < 50]
            if len(good_matches) < 3:
                logger.info("[Agent 1: Selector] Low ORB keypoint match agreement. Proceeding with AI anomaly ensemble.")
                layout_warning = "Low visual keypoint agreement; this may indicate a wrong reference or severe structural anomaly."
        except Exception as match_err:
            logger.error(f"[Agent 1: Selector] Keypoint matching failed: {match_err}")
            layout_warning = "Unable to complete layout keypoint agreement check."
    else:
        layout_warning = "Unable to extract enough visual keypoints for reference agreement check."

    h_ref, w_ref = ref.shape[:2]
    h_src, w_src = src.shape[:2]
    ar_ref = w_ref / max(h_ref, 1)
    ar_src = w_src / max(h_src, 1)

    logger.info(f"[Agent 1: Selector] Aspect Ratios - Golden: {ar_ref:.2f}, Captured: {ar_src:.2f}")
    if abs(ar_ref - ar_src) > 0.4:
        return {
            "viable": True,
            "warning": True,
            "detail": f"Aspect ratio mismatch detected (Golden: {ar_ref:.2f}, Captured: {ar_src:.2f}). Bypassing pixel alignment for semantic AI comparison."
        }

    w_ratio = w_src / max(w_ref, 1)
    h_ratio = h_src / max(h_ref, 1)

    logger.info(f"[Agent 1: Selector] Dimension Ratios - Width: {w_ratio:.2f}, Height: {h_ratio:.2f}")
    if w_ratio < 0.25 or w_ratio > 4.0 or h_ratio < 0.25 or h_ratio > 4.0:
        return {
            "viable": True,
            "warning": True,
            "detail": f"Resolution scale difference detected (Captured: {w_src}x{h_src}, Golden: {w_ref}x{h_ref}). Bypassing pixel alignment for semantic AI comparison."
        }

    logger.info("[Agent 1: Selector] Images verified as viable for standard pixel comparison.")
    return {"viable": True, "warning": bool(layout_warning), "detail": layout_warning}


def classify_part_commodity(image_path: str) -> str:
    """
    Agent 1: Classifier.
    Uses local OCR-based heuristics for commodity classification.
    """
    logger.info(f"[Agent 1: Selector] Classifying commodity for golden reference image: {image_path}")

    # Local fallback heuristics (OCR + keyword match)
    logger.info("[Agent 1: Selector] Running local fallback classifier heuristics...")
    try:
        img = cv2.imread(image_path)
        if img is not None:
            from app.services.agent_3_detector import extract_ocr_text
            text, _ = extract_ocr_text(img)
            text = text.lower()
            logger.info(f"[Agent 1: Selector] Local fallback classifier extracted text snippet: '{text[:80]}'")

            keyword_map = {
                "label": ["serial", "warranty", "void", "sticker", "seal"],
                "processor": ["intel", "amd", "core", "ryzen", "cpu"],
                "ram": ["ddr", "ram", "memory", "dimm"],
                "storage": ["ssd", "nvme", "sata", "hdd"],
                "microchip": ["chip", "ic", "microchip", "controller"],
            }
            for commodity, keywords in keyword_map.items():
                if any(k in text for k in keywords):
                    logger.info(f"[Agent 1: Selector] Local heuristic matched: {commodity}")
                    return commodity
    except Exception as e:
        logger.error(f"[Agent 1: Selector] Local fallback classifier failed: {e}")

    logger.warning(
        "[Agent 1: Selector] Could not confidently classify commodity type "
        "(AI classification and local OCR heuristics both failed/inconclusive). "
        "Returning 'other' instead of guessing, so downstream agents/UI can flag this for human review."
    )
    return "other"


def auto_select_golden_reference(uploaded_image_path: str, db) -> dict:
    """
    Agent 1 (Reference Selector):
    Auto-detects and retrieves the best matching OEM Golden Standard from the
    Reference Library using 512-dim visual vector embeddings & Cosine Similarity search.
    """
    logger.info(f"[Agent 1: Reference Selector] Auto-selecting Golden Reference for: {uploaded_image_path}")
    from app.services.embedding_service import search_reference_library

    search_res = search_reference_library(uploaded_image_path, db)
    if not search_res.get("matched"):
        logger.warning(f"[Agent 1: Reference Selector] Vector search failed: {search_res.get('detail')}")
        return search_res

    top_match = search_res["top_match"]
    logger.info(
        f"[Agent 1: Reference Selector] Successfully auto-paired uploaded scan with "
        f"'{top_match['part_number']}' ({top_match['name']}) at {top_match['similarity_score']}% confidence."
    )
    return search_res