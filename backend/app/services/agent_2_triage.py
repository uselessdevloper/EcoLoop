import os
import cv2
import numpy as np
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Minimum RANSAC inlier ratio required before we trust a homography enough
# to apply illumination normalization off it. The previous 0.01 (1%) bar
# let near-garbage alignments through.
MIN_RELIABLE_INLIER_RATIO = 0.15
MIN_RELIABLE_INLIER_COUNT = 10


def _ensure_gray(img: np.ndarray) -> np.ndarray:
    if img is None:
        raise ValueError("Image input cannot be None")
    if len(img.shape) == 2:
        return img
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def check_blur(img: np.ndarray) -> tuple[bool, float]:
    """
    Computes Laplacian variance to detect image blur.
    Returns: (is_blurry, variance_score)
    """
    logger.info("Running image blur/clarity validation...")
    gray = _ensure_gray(img)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    is_blurry = variance < settings.BLUR_THRESHOLD
    logger.info(f"Clarity score (variance): {variance:.2f} (Threshold: {settings.BLUR_THRESHOLD}). Status: {'Blurry' if is_blurry else 'Clear'}")
    return is_blurry, variance


def check_lighting(img: np.ndarray) -> tuple[bool, float]:
    """
    Checks average pixel intensity to verify lighting.
    Returns: (is_poor_lighting, mean_brightness)
    """
    logger.info("Running image lighting intensity validation...")
    gray = _ensure_gray(img)
    mean_brightness = np.mean(gray)
    is_poor = (mean_brightness < settings.BRIGHTNESS_MIN) or (mean_brightness > settings.BRIGHTNESS_MAX)
    logger.info(f"Mean brightness value: {mean_brightness:.1f} (Limits: {settings.BRIGHTNESS_MIN} to {settings.BRIGHTNESS_MAX}). Status: {'Poor' if is_poor else 'Optimal'}")
    return is_poor, mean_brightness


def align_images(src_img: np.ndarray, ref_img: np.ndarray) -> tuple[np.ndarray, float, bool]:
    """
    Aligns source image with reference image using ORB keypoint descriptors and Homography.
    Returns: (aligned_image, match_percentage, is_reliable)

    is_reliable reflects the RANSAC inlier ratio (how many of the "good"
    matches actually agreed on one consistent geometric transform), not just
    the raw count of good matches — a high raw match rate can still produce
    a garbage homography if the matches don't geometrically agree.
    """
    logger.info("Performing geometric alignment (homography registration) between source and reference templates...")
    gray_src = _ensure_gray(src_img)
    gray_ref = _ensure_gray(ref_img)

    orb = cv2.ORB_create(nfeatures=2000)
    kp_src, des_src = orb.detectAndCompute(gray_src, None)
    kp_ref, des_ref = orb.detectAndCompute(gray_ref, None)

    if des_src is None or des_ref is None:
        logger.warning("Failed to extract ORB features from either source or reference. Homography skipped.")
        return src_img, 0.0, False

    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des_src, des_ref)
    matches = sorted(matches, key=lambda x: x.distance)

    good_matches = [m for m in matches if m.distance < 50]
    match_rate = len(good_matches) / max(len(kp_src), len(kp_ref), 1)

    logger.info(f"Geometric matching: Extracted {len(kp_src)} src keypoints, {len(kp_ref)} ref keypoints. Found {len(good_matches)} good matches (rate: {match_rate:.3f})")

    MIN_MATCHES_FOR_HOMOGRAPHY = 10
    if len(good_matches) < MIN_MATCHES_FOR_HOMOGRAPHY:
        logger.warning(
            f"Not enough good keypoint matches ({len(good_matches)} < {MIN_MATCHES_FOR_HOMOGRAPHY}) to reliably "
            f"estimate a homography transform. 4 points is the mathematical minimum but produces degenerate, "
            f"overfit transforms with zero redundancy — RANSAC needs a comfortable surplus to reject outliers."
        )
        return src_img, match_rate, False

    src_pts = np.array([kp_src[m.queryIdx].pt for m in good_matches], dtype=np.float32).reshape(-1, 1, 2)
    ref_pts = np.array([kp_ref[m.trainIdx].pt for m in good_matches], dtype=np.float32).reshape(-1, 1, 2)

    h_matrix, mask = cv2.findHomography(src_pts, ref_pts, cv2.RANSAC, 5.0)

    if h_matrix is None:
        logger.warning("Homography estimation failed (degenerate point configuration). Returning unaligned source image.")
        return src_img, match_rate, False

    inlier_count = int(mask.sum()) if mask is not None else 0
    inlier_ratio = inlier_count / max(len(good_matches), 1)
    is_reliable = inlier_count >= MIN_RELIABLE_INLIER_COUNT and inlier_ratio >= MIN_RELIABLE_INLIER_RATIO

    logger.info(
        f"Homography inlier check: {inlier_count}/{len(good_matches)} matches agreed with the estimated transform "
        f"(ratio: {inlier_ratio:.3f}, reliable: {is_reliable})"
    )

    height, width, channels = ref_img.shape
    aligned_img = cv2.warpPerspective(src_img, h_matrix, (width, height))
    logger.info(f"Image aligned to frame resolution: {width}x{height}")

    return aligned_img, match_rate, is_reliable


def normalize_illumination(src_img: np.ndarray, ref_img: np.ndarray) -> np.ndarray:
    """
    Normalizes the illumination of src_img to match the average brightness
    and contrast of ref_img using mean/std scaling in Lab color space.
    """
    logger.info("Applying contrast/brightness normalization to match golden template illumination...")
    src_lab = cv2.cvtColor(src_img, cv2.COLOR_BGR2LAB)
    ref_lab = cv2.cvtColor(ref_img, cv2.COLOR_BGR2LAB)

    l_src, a_src, b_src = cv2.split(src_lab)
    l_ref, a_ref, b_ref = cv2.split(ref_lab)

    mean_src, std_src = l_src.mean(), l_src.std()
    mean_ref, std_ref = l_ref.mean(), l_ref.std()

    logger.info(f"Pre-normalization Lightness stats: Source Mean={mean_src:.1f} Std={std_src:.1f} | Reference Mean={mean_ref:.1f} Std={std_ref:.1f}")

    if std_src > 0.001:
        l_norm = ((l_src - mean_src) * (std_ref / std_src)) + mean_ref
        l_norm = np.clip(l_norm, 0, 255).astype(np.uint8)
    else:
        l_norm = l_src

    norm_lab = cv2.merge([l_norm, a_src, b_src])
    normalized_bgr = cv2.cvtColor(norm_lab, cv2.COLOR_LAB2BGR)

    logger.info("Contrast and brightness matching completed.")
    return normalized_bgr


def process_and_validate(image_path: str, golden_path: str) -> dict:
    """
    Loads and runs validation on the source image, and registers/aligns it with the golden image.
    """
    logger.info(f"Processing image validation request for source: {image_path}")
    result = {
        "status": "pass",
        "detail": "",
        "blur_score": 0.0,
        "brightness_score": 0.0,
        "alignment_rate": 0.0,
        "alignment_reliable": False,
        "alignment_skipped": False,
        "alignment_status": "not_run",
        "aligned_image": None
    }

    src = cv2.imread(image_path)
    if src is None:
        logger.error(f"Image read failure: file does not exist or is corrupted at {image_path}")
        result.update({"status": "fail", "detail": "Unable to read uploaded image"})
        return result

    # 1. Check Blur
    is_blurry, blur_val = check_blur(src)
    result["blur_score"] = blur_val
    if is_blurry:
        detail_msg = f"Image quality is too poor (blurry, clarity score {blur_val:.1f} < threshold {settings.BLUR_THRESHOLD}). Retake required: Please hold camera steady and capture a high-focus close-up of the component label."
        logger.warning(f"Validation failure details: {detail_msg}")
        result.update({"status": "retake_needed", "detail": detail_msg})
        return result

    # 2. Check Brightness
    is_poor_light, light_val = check_lighting(src)
    result["brightness_score"] = light_val
    if is_poor_light:
        if light_val < settings.BRIGHTNESS_MIN:
            guidance = "Image is underexposed/dark. Please turn on direct workstation lighting and re-capture the top-level part label."
        else:
            guidance = "Image is overexposed/glared. Please adjust light positioning to reduce camera glare over the component label."
        detail_msg = f"Image quality is too poor (lighting intensity {light_val:.1f}). Retake required: {guidance}"
        logger.warning(f"Validation failure details: {detail_msg}")
        result.update({"status": "retake_needed", "detail": detail_msg})
        return result

    # Load golden reference image
    if not os.path.isabs(golden_path):
        golden_path = os.path.join(settings.BASE_DIR, golden_path)
    logger.info(f"Loading golden reference template from {golden_path}")
    ref = cv2.imread(golden_path)
    if ref is None:
        logger.warning("Golden reference file not found or unreadable. Failing inspection before detection.")
        result.update({
            "status": "failed",
            "detail": "Golden reference image is missing or unreadable. Cannot perform audit-grade comparison.",
            "aligned_image": src,
            "alignment_rate": 0.0,
            "alignment_reliable": False,
            "alignment_skipped": True,
            "alignment_status": "failed",
        })
        return result

    # 3. Geometric Alignment
    try:
        aligned_img, align_rate, is_reliable = align_images(src, ref)
    except Exception as e:
        logger.error(f"Geometric alignment raised unexpectedly: {e}. Falling back to unaligned source image.")
        aligned_img, align_rate, is_reliable = src, 0.0, False

    if not is_reliable:
        detail_msg = f"Geometric alignment bypassed (layout mismatch, alignment confidence: {align_rate*100:.1f}%). Running semantic Multimodal Vision AI comparison fallback."
        logger.info(detail_msg)
        result.update({
            "status": "pass",
            "detail": detail_msg,
            "alignment_rate": align_rate,
            "alignment_reliable": False,
            "alignment_status": "semantic_fallback",
            "aligned_image": src
        })
        return result

    # 4. Illumination and contrast normalization (Lighting correction)
    # Only trust the homography enough to re-color the image if the alignment
    # was actually geometrically reliable — a low-confidence/garbage
    # homography should not be used to rewrite pixel values.
    try:
        aligned_img = normalize_illumination(aligned_img, ref)
    except Exception as e:
        logger.error(f"Illumination normalization failed: {e}. Keeping geometrically aligned image without color correction.")

    result["aligned_image"] = aligned_img
    result["alignment_rate"] = align_rate
    result["alignment_reliable"] = is_reliable
    result["alignment_status"] = "aligned"

    logger.info("Image intake preprocessing tasks finished successfully.")
    return result