import cv2
import numpy as np
import os
import base64
import requests
import logging
from app.config import settings

logger = logging.getLogger(__name__)


def inspect_anomalies_multimodal(src_image_path: str, ref_image_path: str, commodity: str) -> str:
    """
    Queries NVIDIA NIM multimodal vision model to semantically compare images.
    """
    logger.info(f"[Agent 3D: Vision Sub-Agent] Running multimodal visual comparison for commodity '{commodity}'...")
    
    nim_key = getattr(settings, "NVIDIA_NIM_API_KEY", None)

    if not nim_key:
        logger.warning("[Agent 3D: Vision Sub-Agent] NVIDIA_NIM_API_KEY not configured. Skipping multimodal visual comparison.")
        return "Visual comparison skipped: API key not configured."

    try:
        src = cv2.imread(src_image_path)
        ref = cv2.imread(ref_image_path)
        if src is None or ref is None:
            return "Visual comparison failed: Unable to load target or reference images."

        def prepare_base64(img):
            h, w = img.shape[:2]
            max_dim = 512
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
            _, buffer = cv2.imencode('.png', img)
            return base64.b64encode(buffer).decode("utf-8")

        src_b64 = prepare_base64(src)
        ref_b64 = prepare_base64(ref)

        # NVIDIA NIM accepts only 1 image per prompt. Combine golden + target
        # into a single side-by-side comparison image.
        combined_h = max(src.shape[0], ref.shape[0])
        combined_w = src.shape[1] + ref.shape[1] + 10
        combined = np.ones((combined_h, combined_w, 3), dtype=np.uint8) * 255
        combined[:ref.shape[0], :ref.shape[1]] = ref
        combined[:src.shape[0], ref.shape[1]+10:] = src
        cv2.putText(combined, "GOLDEN", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        cv2.putText(combined, "TARGET", (ref.shape[1]+15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        _, buffer = cv2.imencode('.png', combined)
        combined_b64 = base64.b64encode(buffer).decode("utf-8")

        prompt = (
            f"You are an expert QA visual inspection AI. The image shows a {commodity} part comparison:\n"
            f"LEFT side = OEM Golden Reference Standard (correct layout).\n"
            f"RIGHT side = Aligned Target Scan (actual part under inspection).\n\n"
            f"Identify any semantic visual differences, anomalies, or defects in the TARGET (RIGHT) compared to the GOLDEN (LEFT).\n"
            f"Look for:\n"
            f"1. Missing components (chips, resistors, labels, connectors, etc.).\n"
            f"2. Physical damages (cracks, scratches, burns, solder residue).\n"
            f"3. Alignment or rotation mismatches.\n"
            f"4. Label differences (mismatched texts, logos, styles).\n\n"
            f"Write a concise, bulleted description of what is physically wrong with the target scan. "
            f"Be precise about locations. "
            f"If they are identical, reply with 'No anomalies detected.'"
        )

        url = f"{getattr(settings, 'NVIDIA_NIM_BASE_URL', 'https://integrate.api.nvidia.com/v1')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {nim_key}",
            "Content-Type": "application/json",
        }
        model_name = getattr(settings, "NVIDIA_VISION_MODEL", "meta/llama-3.2-11b-vision-instruct")
        logger.info(f"[Agent 3D: Vision Sub-Agent] Querying NVIDIA NIM vision model: {model_name}")
        payload = {
            "model": model_name,
            "temperature": 0.1,
            "max_tokens": 512,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{combined_b64}"}}
                    ]
                }
            ]
        }

        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            res_data = response.json()
            description = res_data["choices"][0]["message"]["content"].strip()
            logger.info(f"[Agent 3D: Vision Sub-Agent] Visual comparison result:\n{description}")
            return description
        else:
            logger.error(f"[Agent 3D: Vision Sub-Agent] API returned status {response.status_code}: {response.text}")
            return f"Visual comparison failed: API returned status {response.status_code}."
    except requests.exceptions.Timeout:
        logger.warning("[Agent 3D: Vision Sub-Agent] API request timed out (15s limit reached).")
        return "Visual comparison skipped: API timeout."
    except Exception as e:
        logger.error(f"[Agent 3D: Vision Sub-Agent] Multimodal vision query failed: {e}")
        return f"Visual comparison failed due to system exception: {str(e)}."


def generate_diagnostic_card(src_img: np.ndarray, ref_img: np.ndarray, heatmap_overlay: np.ndarray, annotated_img: np.ndarray = None) -> np.ndarray:
    """
    Combines the Golden Reference, Defect-Annotated Target Scan, and SSIM Thermal Heatmap
    side-by-side into a single diagnostic image.
    """
    logger.info("Generating unified visual diagnostic card...")
    
    def _ensure_rgb(img):
        if img is None:
            raise ValueError("Image input cannot be None")
        if img.ndim == 2:
            return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        if img.ndim == 3 and img.shape[2] == 4:
            return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
        if img.ndim == 3 and img.shape[2] == 3:
            return img
        raise ValueError(f"Unsupported image shape: {img.shape}")

    ref = _ensure_rgb(ref_img)
    heat = _ensure_rgb(heatmap_overlay)
    
    if annotated_img is not None:
        target_display = _ensure_rgb(annotated_img)
    else:
        target_display = _ensure_rgb(src_img)

    h, w = ref.shape[:2]
    card_h = 360
    card_w = int(w * (card_h / h))

    ref_resized = cv2.resize(ref, (card_w, card_h))
    target_resized = cv2.resize(target_display, (card_w, card_h))
    heat_resized = cv2.resize(heat, (card_w, card_h))

    header_h = 40
    def add_header(img, text, color):
        header = np.ones((header_h, card_w, 3), dtype=np.uint8) * 15
        cv2.line(header, (0, header_h - 1), (card_w, header_h - 1), color, 2)
        cv2.putText(header, text, (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220, 220, 220), 2, cv2.LINE_AA)
        return np.vstack([header, img])

    ref_card = add_header(ref_resized, "GOLDEN STANDARD", (6, 182, 212))
    target_card = add_header(target_resized, "TARGET SCAN (DEFECTS MARKED)", (239, 68, 68))
    heat_card = add_header(heat_resized, "THERMAL HEATMAP", (255, 165, 0))

    separator = np.ones((card_h + header_h, 4, 3), dtype=np.uint8) * 15
    diagnostic_card = np.hstack([ref_card, separator, target_card, separator, heat_card])
    return diagnostic_card