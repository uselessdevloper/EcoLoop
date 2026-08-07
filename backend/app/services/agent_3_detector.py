import cv2
import numpy as np
import os
import logging
import difflib
from typing import Optional
from skimage.metrics import structural_similarity as ssim
from app.config import settings
from app.services.agent_3_multimodal import inspect_anomalies_multimodal, generate_diagnostic_card

logger = logging.getLogger(__name__)

# EasyOCR Reader (lazy initialized)
_ocr_reader = None


def get_ocr_reader(retry: bool = False):
    """
    Returns a ready EasyOCR reader.
    EasyOCR is a free, open-source OCR engine that runs locally on your machine.
    It uses deep learning (PyTorch) to detect and recognize text from images.
    No API keys or internet connection required.
    """
    global _ocr_reader

    if _ocr_reader is None or retry:
        logger.info("Initializing EasyOCR reader (free, offline OCR engine)...")
        try:
            import easyocr
            _ocr_reader = easyocr.Reader(['en'], gpu=False)
            logger.info("EasyOCR reader initialized successfully.")
        except Exception as e:
            logger.error(f"EasyOCR initialization failed: {e}")
            raise RuntimeError(f"EasyOCR initialization failed: {e}")

    return _ocr_reader


def _readtext(reader, img: np.ndarray) -> list[str]:
    """
    Reads text from image using EasyOCR.
    EasyOCR works by:
    1. Detecting text regions in the image using CRAFT algorithm
    2. Recognizing characters using a CRNN neural network
    3. Returns list of detected text strings
    """
    try:
        results = reader.readtext(img)
        return [text for (_, text, _) in results]
    except Exception as e:
        logger.error(f"EasyOCR readtext failed: {e}")
        return []


def _ensure_rgb(img: np.ndarray) -> np.ndarray:
    if img is None:
        raise ValueError("Image input cannot be None")
    if img.ndim == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.ndim == 3 and img.shape[2] == 4:
        return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    if img.ndim == 3 and img.shape[2] == 3:
        return img
    raise ValueError(f"Unsupported image shape for RGB conversion: {img.shape}")


def _ensure_gray(img: np.ndarray) -> np.ndarray:
    if img is None:
        raise ValueError("Image input cannot be None")
    if img.ndim == 2:
        return img
    return cv2.cvtColor(_ensure_rgb(img), cv2.COLOR_BGR2GRAY)


def _normalize_roi_config(roi_config: dict = None) -> dict:
    """Use label ROI as the default template/color ROI when only one ROI is configured."""
    normalized = dict(roi_config or {})
    label_roi = normalized.get("label_roi")
    if label_roi:
        normalized.setdefault("template_roi", label_roi)
        normalized.setdefault("color_roi", label_roi)
    return normalized


def _region_label(x: int, y: int, w: int, h: int, img_shape: tuple) -> str:
    img_h, img_w = img_shape[:2]
    cx = x + (w / 2.0)
    cy = y + (h / 2.0)
    horizontal = "left" if cx < img_w / 3 else "right" if cx > (img_w * 2 / 3) else "center"
    vertical = "top" if cy < img_h / 3 else "bottom" if cy > (img_h * 2 / 3) else "middle"
    return f"{vertical}-{horizontal}"


def _is_plausible_expected_label(text: str) -> bool:
    cleaned = (text or "").strip()
    if not cleaned:
        return False
    lowered = cleaned.lower()
    if lowered.startswith(("gold-", "auto-")):
        return False
    if lowered in {"motherboard", "ram", "storage", "ssd", "processor", "microchip", "label"}:
        return False
    return len(cleaned) <= 64


def compute_ssim_diff(src_img: np.ndarray, ref_img: np.ndarray) -> tuple[float, np.ndarray, np.ndarray, list[dict]]:
    """
    Computes SSIM between source and reference.
    Returns: (ssim_score, realistic_thermal_heatmap_image, annotated_defective_image, anomaly_regions)
    """
    logger.info("Executing SSIM structural anomaly detector...")
    gray_src = _ensure_gray(src_img)
    gray_ref = _ensure_gray(ref_img)

    if gray_src.shape != gray_ref.shape:
        logger.info(f"Shape mismatch in SSIM inputs: {gray_src.shape} != {gray_ref.shape}. Resizing source to match reference.")
        gray_src = cv2.resize(gray_src, (gray_ref.shape[1], gray_ref.shape[0]))
        src_img = cv2.resize(src_img, (ref_img.shape[1], ref_img.shape[0]))

    score, diff = ssim(gray_ref, gray_src, full=True)
    diff_u8 = ((1.0 - diff) * 127.5).clip(0, 255).astype("uint8")

    # Generate thermal heatmap
    blurred_diff = cv2.GaussianBlur(diff_u8, (21, 21), 0)
    blurred_diff = cv2.bilateralFilter(blurred_diff, 9, 50, 50)
    thermal_colormap = cv2.applyColorMap(blurred_diff, cv2.COLORMAP_JET)

    alpha_mask = blurred_diff.astype(np.float32) / 180.0
    alpha_mask = np.clip(alpha_mask, 0.0, 1.0)
    alpha_mask_3ch = cv2.merge([alpha_mask, alpha_mask, alpha_mask])

    realistic_heatmap = (src_img.astype(np.float32) * (1.0 - alpha_mask_3ch * 0.55) + 
                         thermal_colormap.astype(np.float32) * (alpha_mask_3ch * 0.55)).astype("uint8")

    sharpen_kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]]) / 3.0
    realistic_heatmap = cv2.filter2D(realistic_heatmap, -1, sharpen_kernel)

    # Detect anomaly regions
    _, anomaly_mask = cv2.threshold(blurred_diff, 25, 255, cv2.THRESH_BINARY)
    kernel_clean = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    anomaly_mask = cv2.morphologyEx(anomaly_mask, cv2.MORPH_OPEN, kernel_clean)
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    dilated_mask = cv2.dilate(anomaly_mask, kernel_dilate, iterations=1)
    contours, _ = cv2.findContours(dilated_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    annotated_target = src_img.copy()
    defect_overlay = np.zeros_like(src_img)
    defect_overlay[:, :] = (0, 0, 200)

    contour_count = 0
    all_defect_regions = []
    anomaly_regions = []

    for c in contours:
        area = cv2.contourArea(c)
        if area > 50:
            contour_count += 1
            x, y, w, h = cv2.boundingRect(c)
            all_defect_regions.append((x, y, w, h))
            severity = "critical" if area > 1000 else "moderate"
            anomaly_regions.append({
                "detector": "ssim",
                "x": int(x), "y": int(y), "w": int(w), "h": int(h),
                "area": float(round(area, 2)),
                "severity": severity,
                "location": _region_label(x, y, w, h, src_img.shape),
            })

            cv2.rectangle(realistic_heatmap, (x, y), (x + w, y + h), (255, 255, 255), 3, cv2.LINE_AA)
            cv2.rectangle(defect_overlay, (x, y), (x + w, y + h), (0, 0, 255), -1)
            cv2.rectangle(annotated_target, (x - 4, y - 4), (x + w + 4, y + h + 4), (0, 255, 255), 4, cv2.LINE_AA)
            cv2.rectangle(annotated_target, (x, y), (x + w, y + h), (0, 0, 255), 4, cv2.LINE_AA)

    if contour_count > 0:
        mask_3ch = np.zeros_like(src_img)
        for (x, y, w, h) in all_defect_regions:
            mask_3ch[y:y+h, x:x+w] = 1.0
        annotated_target = (annotated_target.astype(np.float32) * (1.0 - mask_3ch * 0.45) + 
                           defect_overlay.astype(np.float32) * (mask_3ch * 0.45)).astype("uint8")

    if contour_count == 0:
        cv2.putText(annotated_target, "NO DEFECTS DETECTED", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 0), 2, cv2.LINE_AA)
        cv2.putText(realistic_heatmap, "CLEAN - No Anomalies", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 0), 2, cv2.LINE_AA)

    anomaly_regions.sort(key=lambda r: r["area"], reverse=True)
    logger.info(f"SSIM structural check complete. Score: {score:.4f}, Defect hotspots detected: {contour_count}")
    return float(score), realistic_heatmap, annotated_target, anomaly_regions[:12]


def _preprocess_for_ocr(crop: np.ndarray) -> np.ndarray:
    """Cleans up a label crop before handing it to EasyOCR for better accuracy."""
    try:
        crop_h, crop_w = crop.shape[:2]
        min_dim = 300
        if 0 < crop_h < min_dim or 0 < crop_w < min_dim:
            scale = min_dim / max(crop_h, crop_w, 1)
            crop = cv2.resize(crop, (int(crop_w * scale), int(crop_h * scale)), interpolation=cv2.INTER_CUBIC)

        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop
        denoised = cv2.bilateralFilter(gray, 7, 50, 50)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        contrast_boosted = clahe.apply(denoised)
        binarized = cv2.adaptiveThreshold(contrast_boosted, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, blockSize=25, C=10)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
        cleaned = cv2.morphologyEx(binarized, cv2.MORPH_OPEN, kernel)
        return cv2.cvtColor(cleaned, cv2.COLOR_GRAY2BGR)
    except Exception as e:
        logger.warning(f"OCR preprocessing failed: {e}")
        return crop


def extract_ocr_text(img: np.ndarray, roi: dict = None, expected_serial: str = "") -> tuple[str, bool]:
    """Crops ROI and reads text using EasyOCR (free, offline OCR engine)."""
    logger.info("Executing text extraction (EasyOCR)...")
    crop = img
    cropped_used = False
    
    if roi:
        x = roi.get("x", 0)
        y = roi.get("y", 0)
        w = roi.get("width") if "width" in roi else roi.get("w", 0)
        h = roi.get("height") if "height" in roi else roi.get("h", 0)
        if y + h <= img.shape[0] and x + w <= img.shape[1] and w > 0 and h > 0:
            crop = img[y:y + h, x:x + w]
            cropped_used = True
            crop_h, crop_w = crop.shape[:2]
            min_dim = 300
            if 0 < crop_h < min_dim or 0 < crop_w < min_dim:
                scale = min_dim / max(crop_h, crop_w, 1)
                crop = cv2.resize(crop, (int(crop_w * scale), int(crop_h * scale)), interpolation=cv2.INTER_CUBIC)
        else:
            logger.warning("Configured ROI exceeds image boundaries. Defaulting to full image.")

    try:
        reader = get_ocr_reader()
    except RuntimeError as e:
        logger.error(f"OCR Reader offline: {e}")
        return "", False

    try:
        texts = _readtext(reader, crop)
        detected = " ".join(texts).strip()

        is_poor_match = False
        if expected_serial and detected:
            s_detected = detected.upper().replace(" ", "")
            s_expected = expected_serial.upper().replace(" ", "")
            common = sum(1 for c in s_expected if c in s_detected)
            match_ratio = common / max(len(s_expected), 1)
            is_poor_match = match_ratio < 0.25

        if (not detected or is_poor_match) and cropped_used:
            logger.info("Crop ROI returned poor match. Triggering full-frame OCR fallback...")
            full_texts = _readtext(reader, img)
            detected_full = " ".join(full_texts).strip()
            if detected_full:
                detected = detected_full

        logger.info(f"EasyOCR parsing complete. Detected text: '{detected}'")
        return detected, True
    except Exception as e:
        logger.error(f"Error during OCR extraction: {e}")
        return "", False


import difflib

_CONFUSION_PAIRS = {
    ('O', '0'), ('0', 'O'),
    ('I', '1'), ('1', 'I'), ('|', 'I'), ('I', '|'), ('|', '1'), ('1', '|'),
    ('S', '5'), ('5', 'S'),
    ('G', '6'), ('6', 'G'),
    ('B', '8'), ('8', 'B'),
    ('Z', '2'), ('2', 'Z'),
    ('T', '7'), ('7', 'T'),
}


def calculate_string_diff(str1: str, str2: str) -> dict:
    """
    Compare two strings using sequence matching to handle OCR errors gracefully.
    Returns: {"similarity": float, "mismatches": list, "suspicious_confusions": list}
    """
    logger.info(f"Comparing OCR detected string '{str1}' against master catalog reference '{str2}'")
    s1 = str1.upper().replace(" ", "")
    s2 = str2.upper().replace(" ", "")

    matcher = difflib.SequenceMatcher(None, s1, s2, autojunk=False)
    similarity = matcher.ratio()

    mismatches = []
    suspicious_confusions = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue

        detected_span = s1[i1:i2]
        expected_span = s2[j1:j2]

        if tag == "replace" and len(detected_span) == len(expected_span):
            for offset, (c1, c2) in enumerate(zip(detected_span, expected_span)):
                mismatch = {
                    "position": j1 + offset,
                    "expected": c2,
                    "detected": c1,
                    "tag": "replace",
                    "confusable": (c1, c2) in _CONFUSION_PAIRS,
                }
                mismatches.append(mismatch)
                if mismatch["confusable"]:
                    suspicious_confusions.append(mismatch)
        else:
            mismatch = {
                "position": j1,
                "expected": expected_span,
                "detected": detected_span,
                "tag": tag,
                "confusable": False,
            }
            mismatches.append(mismatch)

    logger.info(f"Fuzzy character validation complete. String similarity rate: {similarity:.2f}, mismatches count: {len(mismatches)}")
    return {
        "similarity": similarity,
        "mismatches": mismatches,
        "suspicious_confusions": suspicious_confusions,
    }


def match_keypoints(src_img: np.ndarray, ref_img: np.ndarray) -> dict:
    """Match local features with BFMatcher and Lowe's ratio test."""
    logger.info("Executing Keypoint Descriptor Matching algorithm...")
    gray_src = _ensure_gray(src_img)
    gray_ref = _ensure_gray(ref_img)

    orb = cv2.ORB_create(500)
    kp1, desc1 = orb.detectAndCompute(gray_src, None)
    kp2, desc2 = orb.detectAndCompute(gray_ref, None)

    if desc1 is None or desc2 is None or len(desc1) < 2 or len(desc2) < 2:
        logger.warning("Insufficient descriptor points extracted from images.")
        return {"keypoint_match_score": 0.0, "good_matches": 0, "total_matches": 0}

    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    raw_matches = bf.knnMatch(desc1, desc2, k=2)

    good_matches = []
    for match_pair in raw_matches:
        if len(match_pair) < 2:
            continue
        first_match, second_match = match_pair
        if first_match.distance <= 0.75 * second_match.distance:
            good_matches.append(first_match)

    if not raw_matches:
        score = 0.0
    else:
        score = len(good_matches) / max(min(len(kp1), len(kp2)), 1)
        score = float(np.clip(score, 0.0, 1.0))

    logger.info(f"Keypoints verification complete. Good matches count: {len(good_matches)} / {len(raw_matches)} raw matches. Ratio score: {score:.3f}")
    return {
        "keypoint_match_score": score,
        "good_matches": len(good_matches),
        "total_matches": len(raw_matches),
    }


def match_template_roi(src_img: np.ndarray, ref_img: np.ndarray, roi_config: dict = None) -> dict:
    """Use template matching for ROI/label presence checks."""
    logger.info("Executing Template ROI sticker presence checks...")
    roi_config = _normalize_roi_config(roi_config)
    if not roi_config:
        return {"template_match_score": 1.0, "template_match_found": True, "template_match_checked": False}

    template_roi = roi_config.get("template_roi")
    if not template_roi:
        return {"template_match_score": 1.0, "template_match_found": True, "template_match_checked": False}

    x = template_roi.get("x", 0)
    y = template_roi.get("y", 0)
    w = template_roi.get("width") if "width" in template_roi else template_roi.get("w", 0)
    h = template_roi.get("height") if "height" in template_roi else template_roi.get("h", 0)
    if w <= 0 or h <= 0:
        return {"template_match_score": 1.0, "template_match_found": True, "template_match_checked": False}

    logger.info(f"Cropping template ROI window: x={x}, y={y}, w={w}, h={h}")
    gray_src = _ensure_gray(src_img)
    gray_ref = _ensure_gray(ref_img)

    if y + h > gray_ref.shape[0] or x + w > gray_ref.shape[1]:
        return {"template_match_score": 0.0, "template_match_found": False, "template_match_checked": True}

    template = gray_ref[y:y + h, x:x + w]
    if template.size == 0:
        return {"template_match_score": 0.0, "template_match_found": False, "template_match_checked": True}

    if y + h > gray_src.shape[0] or x + w > gray_src.shape[1]:
        return {"template_match_score": 0.0, "template_match_found": False, "template_match_checked": True}

    src_roi = gray_src[y:y + h, x:x + w]
    if src_roi.size == 0:
        return {"template_match_score": 0.0, "template_match_found": False, "template_match_checked": True}

    result = cv2.matchTemplate(gray_src, template, cv2.TM_CCOEFF_NORMED)
    global_score = float(result.max()) if result.size else 0.0
    roi_score = 1.0 - (float(np.mean(cv2.absdiff(src_roi, template))) / 255.0)
    score = min(global_score, roi_score)
    threshold = float(roi_config.get("template_threshold", 0.6))
    found = bool(score >= threshold)

    logger.info(f"Template Matching finished. Match Score: {score:.3f} (Threshold: {threshold}). Found status: {found}")
    return {
        "template_match_score": float(np.clip(score, 0.0, 1.0)),
        "template_match_found": found,
        "template_match_checked": True,
    }


def compare_color_histograms(src_img: np.ndarray, ref_img: np.ndarray, roi_config: dict = None) -> dict:
    """Compare color histogram similarity for font/color consistency checks."""
    logger.info("Executing 3D Color Histogram similarity check...")
    roi_config = _normalize_roi_config(roi_config)
    color_roi = None
    if roi_config:
        color_roi = roi_config.get("color_roi")

    src = _ensure_rgb(src_img)
    ref = _ensure_rgb(ref_img)

    if color_roi:
        x = color_roi.get("x", 0)
        y = color_roi.get("y", 0)
        w = color_roi.get("width") if "width" in color_roi else color_roi.get("w", 0)
        h = color_roi.get("height") if "height" in color_roi else color_roi.get("h", 0)
        if y + h <= src.shape[0] and x + w <= src.shape[1] and y + h <= ref.shape[0] and x + w <= ref.shape[1]:
            src = src[y:y + h, x:x + w]
            ref = ref[y:y + h, x:x + w]

    if src.shape != ref.shape:
        ref = cv2.resize(ref, (src.shape[1], src.shape[0]))

    hist1 = cv2.calcHist([src], [0, 1, 2], None, [16, 16, 16], [0, 256, 0, 256, 0, 256])
    hist2 = cv2.calcHist([ref], [0, 1, 2], None, [16, 16, 16], [0, 256, 0, 256, 0, 256])
    cv2.normalize(hist1, hist1)
    cv2.normalize(hist2, hist2)

    similarity = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
    similarity = float(np.clip((similarity + 1.0) / 2.0, 0.0, 1.0))
    logger.info(f"Color histogram comparison completed. Correlation similarity index: {similarity:.3f}")
    return {"color_hist_similarity": similarity, "color_hist_checked": True}


def run_anomaly_ensemble(src_img: np.ndarray, ref_img: np.ndarray, roi_config: dict = None, src_image_path: str = None, ref_image_path: str = None, commodity: str = "motherboard") -> dict:
    """Runs the hybrid CV + Vision LLM ensemble comparison logic in PARALLEL."""
    import time
    from concurrent.futures import ThreadPoolExecutor

    t0 = time.time()
    logger.info("⚡ [Agent 3: Detector] Starting Parallel Vision Anomaly Ensemble processing...")
    errors = []
    roi_config = _normalize_roi_config(roi_config)

    # Pre-warm OCR client on main thread
    try:
        get_ocr_reader()
    except RuntimeError as e:
        logger.critical(f"[Agent 3: Detector] OCR unavailable for this entire case: {e}")

    # Pre-warm CLIP embedding model
    try:
        from app.services.embedding_service import _load_clip
        _load_clip()
    except Exception as _clip_prewarm_err:
        logger.warning(f"[Agent 3: Detector] CLIP pre-warm failed: {_clip_prewarm_err}")

    label_roi = None
    expected_serial = ""
    if roi_config:
        label_roi = roi_config.get("label_roi")
        expected_serial = roi_config.get("expected_serial", "")

    def task_ssim():
        try:
            return compute_ssim_diff(src_img, ref_img)
        except Exception as e:
            logger.error(f"SSIM computation failed: {e}")
            return 0.0, src_img.copy(), src_img.copy(), []

    def task_multimodal():
        if src_image_path and ref_image_path:
            try:
                return inspect_anomalies_multimodal(src_image_path, ref_image_path, commodity)
            except Exception as e:
                logger.error(f"Multimodal vision inspection failed: {e}")
                return f"Visual comparison failed: {str(e)}"
        return "Visual comparison skipped: inputs unavailable."

    def task_ocr():
        try:
            target_text, available = extract_ocr_text(src_img, label_roi, expected_serial)
            golden_text, _ = extract_ocr_text(ref_img, label_roi, expected_serial)
            return target_text, golden_text, available
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return "", "", False

    def task_features():
        try:
            kp_res = match_keypoints(src_img, ref_img)
        except Exception as e:
            logger.error(f"Keypoint matching failed: {e}")
            kp_res = {"keypoint_match_score": 0.0, "good_matches": 0, "total_matches": 0}

        try:
            tmpl_res = match_template_roi(src_img, ref_img, roi_config)
        except Exception as e:
            logger.error(f"Template matching failed: {e}")
            tmpl_res = {"template_match_score": 0.0, "template_match_found": False, "template_match_checked": True}

        try:
            color_res = compare_color_histograms(src_img, ref_img, roi_config)
        except Exception as e:
            logger.error(f"Color histogram comparison failed: {e}")
            color_res = {"color_hist_similarity": 0.0, "color_hist_checked": True}

        return kp_res, tmpl_res, color_res

    def task_embedding():
        if src_image_path and ref_image_path and os.path.exists(src_image_path) and os.path.exists(ref_image_path):
            try:
                from app.services.embedding_service import extract_image_embedding, cosine_similarity
                vec1 = extract_image_embedding(src_image_path)
                vec2 = extract_image_embedding(ref_image_path)
                sim = cosine_similarity(vec1, vec2)
                return round(sim * 100.0, 2)
            except Exception as e:
                logger.error(f"Vector embedding comparison failed: {e}")
                return None
        logger.warning("Vector embedding comparison skipped: source/reference image path missing on disk.")
        return None

    # Dispatch tasks to ThreadPoolExecutor for concurrent parallel processing
    with ThreadPoolExecutor(max_workers=5) as executor:
        f_ssim = executor.submit(task_ssim)
        f_multi = executor.submit(task_multimodal)
        f_ocr = executor.submit(task_ocr)
        f_feat = executor.submit(task_features)
        f_emb = executor.submit(task_embedding)

        try:
            ssim_val, heatmap_img, annotated_target, anomaly_regions = f_ssim.result(timeout=10.0)
        except Exception as e:
            logger.error(f"[Agent 3: Detector] SSIM task timed out or failed: {e}")
            errors.append("ssim_timeout_or_failed")
            ssim_val, heatmap_img, annotated_target, anomaly_regions = 0.0, src_img.copy(), src_img.copy(), []

        try:
            multimodal_report = f_multi.result(timeout=25.0)
        except Exception as e:
            logger.warning(f"[Agent 3: Detector] Multimodal vision task timed out or failed: {e}")
            multimodal_report = "Visual comparison skipped: Multimodal response timeout."

        try:
            detected_text, golden_text, ocr_engine_available = f_ocr.result(timeout=15.0)
        except Exception as e:
            logger.error(f"[Agent 3: Detector] OCR task timed out or failed: {e}")
            errors.append("ocr_timeout_or_failed")
            detected_text, golden_text, ocr_engine_available = "", "", False

        try:
            keypoint_results, template_results, color_results = f_feat.result(timeout=10.0)
        except Exception as e:
            logger.error(f"[Agent 3: Detector] Feature/template/color task timed out or failed: {e}")
            errors.append("features_timeout_or_failed")
            keypoint_results = {"keypoint_match_score": 0.0, "good_matches": 0, "total_matches": 0}
            template_results = {"template_match_score": 0.0, "template_match_found": False, "template_match_checked": True}
            color_results = {"color_hist_similarity": 0.0, "color_hist_checked": True}

        try:
            vector_embedding_match = f_emb.result(timeout=10.0)
        except Exception as e:
            logger.error(f"[Agent 3: Detector] Embedding task timed out or failed: {e}")
            errors.append("embedding_timeout_or_failed")
            vector_embedding_match = None

    # Generate visual diagnostic card
    diagnostic_card = None
    try:
        diagnostic_card = generate_diagnostic_card(src_img, ref_img, heatmap_img, annotated_target)
    except Exception as e:
        logger.error(f"Failed to generate side-by-side diagnostic card: {e}")
        errors.append("card_generation_failed")

    # Dynamic Ground-Truth OCR Determination
    explicit_expected = expected_serial if _is_plausible_expected_label(expected_serial) else ""
    golden_expected = (golden_text if label_roi and _is_plausible_expected_label(golden_text) else "")
    master_expected_text = explicit_expected or golden_expected
    expected_text_is_catalog_verified = bool(explicit_expected)

    ocr_diff = {"similarity": 1.0, "mismatches": [], "suspicious_confusions": []}
    if ocr_engine_available and master_expected_text and detected_text:
        ocr_diff = calculate_string_diff(detected_text, master_expected_text)

    score_components = [keypoint_results["keypoint_match_score"]]
    checked_components = ["keypoint"]
    if template_results.get("template_match_checked", True):
        score_components.append(template_results["template_match_score"])
        checked_components.append("template")
    if color_results.get("color_hist_checked", True):
        score_components.append(color_results["color_hist_similarity"])
        checked_components.append("color")

    matching_score = float(np.clip(sum(score_components) / max(len(score_components), 1), 0.0, 1.0))

    elapsed = time.time() - t0
    logger.info(f"⚡ [Agent 3: Detector] Parallel execution finished in {elapsed:.3f}s. SSIM: {ssim_val:.3f}, Matching Score: {matching_score:.3f}")

    expected_text_value = master_expected_text
    detector_results = {
        "ssim": {"score": ssim_val, "threshold": float(getattr(settings, "SSIM_THRESHOLD", 0.80)), "regions": anomaly_regions},
        "ocr": {
            "engine_available": ocr_engine_available,
            "detected_text": detected_text,
            "expected_text": expected_text_value,
            "expected_text_is_catalog_verified": expected_text_is_catalog_verified,
            "similarity": ocr_diff["similarity"],
            "mismatches": ocr_diff["mismatches"],
            "suspicious_confusions": ocr_diff.get("suspicious_confusions", []),
        },
        "keypoints": {"score": keypoint_results["keypoint_match_score"], "good_matches": keypoint_results["good_matches"], "total_matches": keypoint_results["total_matches"]},
        "template": template_results,
        "color": color_results,
        "embedding": {"similarity_pct": vector_embedding_match},
    }
    evidence_summary = {
        "checked_components": checked_components,
        "top_regions": anomaly_regions[:5],
        "ocr_issue_count": len(ocr_diff["mismatches"]),
        "template_missing": bool(template_results.get("template_match_checked") and not template_results.get("template_match_found")),
        "color_similarity": color_results["color_hist_similarity"],
        "keypoint_ratio": keypoint_results["keypoint_match_score"],
    }

    return {
        "ssim_score": ssim_val,
        "detected_text": detected_text,
        "expected_text": expected_text_value,
        "expected_text_is_catalog_verified": expected_text_is_catalog_verified,
        "ocr_similarity": ocr_diff["similarity"],
        "ocr_mismatches": ocr_diff["mismatches"],
        "ocr_diff": ocr_diff,
        "ocr_engine_available": ocr_engine_available,
        "keypoint_ratio": keypoint_results["keypoint_match_score"],
        "keypoint_matches": keypoint_results["good_matches"],
        "template_match_score": template_results["template_match_score"],
        "template_match_found": template_results["template_match_found"],
        "template_match_checked": template_results.get("template_match_checked", False),
        "color_hist_similarity": color_results["color_hist_similarity"],
        "vector_embedding_match": vector_embedding_match,
        "matching_score": matching_score,
        "heatmap_img": heatmap_img,
        "annotated_target": annotated_target,
        "diagnostic_card": diagnostic_card,
        "anomaly_regions": anomaly_regions,
        "detector_results": detector_results,
        "evidence_summary": evidence_summary,
        "thresholds_used": {
            "ssim": float(getattr(settings, "SSIM_THRESHOLD", 0.80)),
            "template": float((roi_config or {}).get("template_threshold", 0.6)),
            "blur": float(getattr(settings, "BLUR_THRESHOLD", 100.0)),
            "brightness_min": int(getattr(settings, "BRIGHTNESS_MIN", 40)),
            "brightness_max": int(getattr(settings, "BRIGHTNESS_MAX", 220)),
            "keypoint_match_min": float(getattr(settings, "KEYPOINT_MATCH_MIN", 0.60)),
        },
        "checked_components": checked_components,
        "errors": errors,
        "multimodal_report": multimodal_report,
    }