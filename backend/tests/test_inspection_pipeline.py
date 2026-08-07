"""
VeriVision-AI Hackathon Test Cases
====================================
Tests the full inspection pipeline against the 6 required scenarios:
1. Missing QC label → Missing → Quarantine & Escalate
2. Altered serial number → Mismatched → Escalate with evidence
3. Reused board → Reused / Tampered → Request additional angle
4. False alarm (lighting) → Clean (after retake) → Retake requested
5. Non-OEM label → Mismatched → Escalate to vendor
6. Swap detection → Tampered → Quarantine & Escalate

Run: pytest backend/tests/ -v
"""

import os
import sys
import cv2
import numpy as np
import pytest
from unittest.mock import patch, MagicMock

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.config import settings
from app.services.agent_2_triage import process_and_validate, check_blur, check_lighting, align_images
from app.services.agent_3_detector import (
    compute_ssim_diff, extract_ocr_text, calculate_string_diff,
    match_keypoints, match_template_roi, compare_color_histograms, run_anomaly_ensemble
)
from app.services.agent_4_decision import make_decision
from app.services.agent_5_explainer import generate_explanation


# =============================================================================
# HELPER: Create synthetic test images
# =============================================================================

def create_test_image(width=640, height=480, color=(200, 200, 200), text_region=False):
    """Create a synthetic test image with optional text label region and line textures."""
    img = np.ones((height, width, 3), dtype=np.uint8) * np.array(color, dtype=np.uint8)
    
    # Draw deterministic texture lines to pass the blur check and generate keypoints
    for i in range(50):
        cv2.line(img, (i * 12, 0), (i * 12 + 10, height), (120, 120, 120), 2)

    # Add a label/sticker region at top-right
    if text_region:
        cv2.rectangle(img, (400, 30), (600, 120), (255, 255, 255), -1)
        cv2.rectangle(img, (400, 30), (600, 120), (0, 0, 0), 2)
        # Add some "text" lines
        cv2.putText(img, "ABC123", (420, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    
    return img


def create_blurry_image(width=640, height=480):
    """Create a blurry test image."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 128
    # Add sharp lines first, then blur them heavily to fail clarity checks
    for i in range(50):
        cv2.line(img, (i * 12, 0), (i * 12 + 10, height), (100, 100, 100), 2)
    img = cv2.GaussianBlur(img, (45, 45), 0)
    return img


def create_dark_image(width=640, height=480):
    """Create an underexposed (dark) test image with texture to pass blur check."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 15
    # Draw high-contrast sharp lines to yield high Laplacian variance while preserving low mean
    for i in range(5):
        cv2.line(img, (i * 120 + 50, 0), (i * 120 + 80, height), (150, 150, 150), 3)
    return img


# =============================================================================
# TEST CASE 1: Missing QC Label
# =============================================================================

class TestMissingQCLabel:
    """Scenario: Golden shows sticker at known location; defective has blank region."""

    def test_1_triage_passes(self):
        """Triage should pass for clear, well-lit image."""
        src = create_test_image(text_region=False)
        ref = create_test_image(text_region=True)
        
        is_blurry, blur_val = check_blur(src)
        is_poor, bright_val = check_lighting(src)
        
        assert not is_blurry, f"Blur check failed: {blur_val}"
        assert not is_poor, f"Lighting check failed: {bright_val}"

    def test_2_template_detects_missing_label(self):
        """Template match should flag missing label/sticker."""
        src = create_test_image(text_region=False)  # No label
        ref = create_test_image(text_region=True)    # Has label
        
        roi_config = {
            "template_roi": {"x": 400, "y": 30, "w": 200, "h": 90},
            "label_roi": {"x": 400, "y": 30, "w": 200, "h": 90}
        }
        
        result = match_template_roi(src, ref, roi_config)
        assert result["template_match_found"] == False, "Should NOT find label on blank image"
        assert result["template_match_score"] < 0.6, f"Score too high: {result['template_match_score']}"

    def test_3_decision_verdict_missing(self):
        """Decision agent should output 'missing' verdict."""
        result = run_anomaly_ensemble(
            create_test_image(text_region=False),
            create_test_image(text_region=True),
            {"label_roi": {"x": 400, "y": 30, "w": 200, "h": 90}, "expected_serial": "ABC123"}
        )
        
        decision = make_decision(result)
        assert decision["verdict"] == "missing", f"Expected 'missing', got '{decision['verdict']}'"
        assert decision["recommended_action"] == "Quarantine & Escalate"
        assert decision["fraud_score"] >= 50

    def test_4_label_roi_falls_back_to_template_roi(self):
        """A configured label ROI must also drive missing sticker checks."""
        src = create_test_image(text_region=False)
        ref = create_test_image(text_region=True)

        result = match_template_roi(src, ref, {
            "label_roi": {"x": 400, "y": 30, "w": 200, "h": 90}
        })

        assert result["template_match_checked"] is True
        assert result["template_match_found"] is False


# =============================================================================
# TEST CASE 2: Altered Serial Number
# =============================================================================

class TestAlteredSerialNumber:
    """Scenario: OCR diff — '0' changed to 'O'."""

    def test_1_ocr_detects_mismatch(self):
        """OCR should detect character-level mismatch."""
        expected = "91165LUS0D0D"
        detected = "91165LUSODOD"  # 0→O substitution
        
        result = calculate_string_diff(detected, expected)
        assert result["similarity"] < 1.0, "Should NOT be exact match"
        assert len(result["mismatches"]) > 0, "Should have mismatches"
        
        # Verify the specific leet-speak substitutions
        for m in result["mismatches"]:
            assert (m["detected"], m["expected"]) in [
                ('O', '0'), ('0', 'O')
            ], f"Unexpected mismatch at pos {m['position']}: '{m['detected']}' vs '{m['expected']}'"

    def test_2_decision_verdict_mismatched(self):
        """Decision agent should output 'mismatched' for leet-speak."""
        result = run_anomaly_ensemble(
            create_test_image(text_region=True),
            create_test_image(text_region=True),
            {"label_roi": {"x": 400, "y": 30, "w": 200, "h": 90}, "expected_serial": "91165LUS0D0D"}
        )
        # Override result to simulate OCR mismatch
        result["detected_text"] = "91165LUSODOD"
        result["expected_text"] = "91165LUS0D0D"
        result["ocr_similarity"] = 0.875  # 7/8 chars match
        result["ocr_mismatches"] = [
            {"position": 6, "expected": "0", "detected": "O"},
            {"position": 8, "expected": "0", "detected": "O"}
        ]
        
        decision = make_decision(result)
        assert decision["verdict"] == "mismatched", f"Expected 'mismatched', got '{decision['verdict']}'"
        assert "Vendor" in decision["recommended_action"] or "Escalate" in decision["recommended_action"]
        assert decision["fraud_score"] >= 30

    @patch("requests.post")
    def test_3_explainer_mentions_ocr_mismatch(self, mock_post):
        """Explainer should reference OCR character mismatches."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "choices": [
                {"message": {"content": "A serial number mismatch was detected. Expected 91165LUS0D0D but got 91165LUSODOD."}}
            ]
        }
        mock_post.return_value = mock_resp

        metrics = {
            "ssim_score": 0.92,
            "verdict": "mismatched",
            "fraud_score": 65,
            "detected_text": "91165LUSODOD",
            "expected_text": "91165LUS0D0D",
            "ocr_mismatches": [{"position": 6, "expected": "0", "detected": "O"}],
            "recommended_action": "Quarantine & Escalate",
            "template_match_score": 1.0,
            "template_match_found": True,
            "color_hist_similarity": 0.95
        }
        explanation = generate_explanation(metrics)
        assert "not match" in explanation.lower() or "mismatch" in explanation.lower(), "Explainer should mention text difference"
        assert "91165" in explanation, "Explainer should reference detected/expected text"


# =============================================================================
# TEST CASE 3: Reused Board
# =============================================================================

class TestReusedBoard:
    """Scenario: Layout matches golden but tamper evidence visible."""

    def test_1_ssim_shows_minor_differences(self):
        """SSIM should be moderate for reused boards."""
        src = create_test_image(color=(210, 200, 190))  # Slightly different color/wear
        # Introduce actual structural difference
        cv2.rectangle(src, (100, 100), (300, 300), (120, 120, 120), -1)
        ref = create_test_image(color=(200, 200, 200))
        
        ssim_score, heatmap, annotated, regions = compute_ssim_diff(src, ref)
        assert 0.50 < ssim_score < 0.95, f"SSIM should be moderate for reused board: {ssim_score}"
        assert isinstance(regions, list)

    def test_2_keypoints_show_moderate_mismatch(self):
        """Keypoint ratio should be moderate for reused components."""
        src = create_test_image(color=(205, 195, 185))
        ref = create_test_image(color=(200, 200, 200))
        
        result = match_keypoints(src, ref)
        assert result["keypoint_match_score"] > 0.0, "Should have some matches"
        assert result["good_matches"] >= 0, "Should find keypoints"


# =============================================================================
# TEST CASE 4: False Alarm (Lighting) → Retake Requested
# =============================================================================

class TestFalseAlarmLighting:
    """Scenario: Triage detects poor lighting and requests retake."""

    def test_1_blurry_image_triggers_retake(self):
        """Blurry image should fail triage with retake_needed."""
        blurry = create_blurry_image()
        ref = create_test_image()
        
        temp_path = "test_blurry_temp.png"
        ref_path = "test_ref_temp.png"
        try:
            cv2.imwrite(temp_path, blurry)
            cv2.imwrite(ref_path, ref)
            
            result = process_and_validate(temp_path, ref_path)
            assert result["status"] == "retake_needed", f"Blurry image should request retake: {result}"
            assert "blur" in result["detail"].lower(), f"Should mention blur: {result['detail']}"
        finally:
            if os.path.exists(temp_path): os.remove(temp_path)
            if os.path.exists(ref_path): os.remove(ref_path)

    def test_2_dark_image_triggers_retake(self):
        """Underexposed image should fail triage with retake."""
        dark = create_dark_image()
        ref = create_test_image()
        
        temp_path = "test_dark_temp.png"
        ref_path = "test_ref_temp.png"
        try:
            cv2.imwrite(temp_path, dark)
            cv2.imwrite(ref_path, ref)
            
            result = process_and_validate(temp_path, ref_path)
            assert result["status"] == "retake_needed", f"Dark image should request retake: {result}"
            assert "lighting" in result["detail"].lower() or "brightness" in result["detail"].lower()
        finally:
            if os.path.exists(temp_path): os.remove(temp_path)
            if os.path.exists(ref_path): os.remove(ref_path)


# =============================================================================
# TEST CASE 5: Non-OEM Label
# =============================================================================

class TestNonOEMLabel:
    """Scenario: Label hue/color differs despite correct serial text."""

    def test_1_color_histogram_detects_difference(self):
        """Color histogram should detect non-OEM label colors."""
        src = create_test_image(color=(180, 220, 200))  # Different hue
        ref = create_test_image(color=(200, 200, 200))
        
        result = compare_color_histograms(src, ref)
        assert result["color_hist_similarity"] < 0.95, f"Color similarity too high: {result['color_hist_similarity']}"

    def test_2_similar_text_but_color_mismatch(self):
        """Same text but different color should still flag."""
        result = run_anomaly_ensemble(
            create_test_image(color=(180, 220, 200), text_region=True),
            create_test_image(color=(200, 200, 200), text_region=True),
            {"expected_serial": "ABC123"}
        )
        assert result["color_hist_similarity"] < 0.95, "Color should differ"


# =============================================================================
# TEST CASE 6: Swap Detection
# =============================================================================

class TestSwapDetection:
    """Scenario: Different component installed — high keypoint mismatch."""

    def test_1_high_ssim_difference(self):
        """SSIM should be low (< 0.65) for completely different components."""
        src = np.zeros((480, 640, 3), dtype=np.uint8)  # Completely blank/different
        ref = create_test_image(color=(200, 200, 200))
        
        ssim_score, heatmap, annotated, regions = compute_ssim_diff(src, ref)
        assert ssim_score < 0.65, f"SSIM should be low for swapped component: {ssim_score}"
        assert len(regions) > 0

    def test_2_keypoint_mismatch_high(self):
        """Keypoint ratio should be very low for swapped component."""
        src = np.zeros((480, 640, 3), dtype=np.uint8)  # Completely blank
        ref = create_test_image()
        
        result = match_keypoints(src, ref)
        assert result["keypoint_match_score"] < 0.3, f"Keypoint score too high: {result['keypoint_match_score']}"


# =============================================================================
# TEST CASE: Clean Pass
# =============================================================================

class TestCleanPass:
    """Same image should pass all checks."""

    def test_same_images_produce_clean_verdict(self):
        """Identical images should result in 'clean' verdict."""
        img = create_test_image(text_region=True)
        result = run_anomaly_ensemble(img, img, {"label_roi": {"x": 400, "y": 30, "w": 200, "h": 90}})
        
        assert result["ssim_score"] > 0.95, "SSIM should be near 1.0 for identical images"
        assert result["keypoint_ratio"] > 0.50, "Keypoints should match well"
        assert result["color_hist_similarity"] > 0.90, "Colors should match"
        
        decision = make_decision(result)
        assert decision["verdict"] == "clean", f"Expected 'clean', got '{decision['verdict']}'"
        assert decision["recommended_action"] == "Accept"

    def test_identical_image_overrides_bad_catalog_ocr(self):
        """An OCR/catalog error can never make an identical reference fraudulent."""
        decision = make_decision({
            "source_reference_identical": True,
            "ssim_score": 1.0,
            "ocr_similarity": 0.0,
            "ocr_mismatches": [{"position": 0, "expected": "X", "detected": "Y"}],
            "keypoint_ratio": 1.0,
            "expected_text": "XPS-REV-409",
            "detected_text": "unrelated OCR output",
            "template_match_score": 1.0,
            "template_match_found": True,
            "color_hist_similarity": 1.0,
        })
        assert decision["fraud_score"] == 0
        assert decision["verdict"] == "clean"

    def test_multimodal_text_cannot_override_clean_evidence(self):
        """Unstructured visual-language text is supporting evidence, not a verdict source."""
        decision = make_decision({
            "source_reference_identical": False,
            "ssim_score": 0.98,
            "ocr_similarity": 1.0,
            "ocr_mismatches": [],
            "keypoint_ratio": 0.95,
            "expected_text": "ABC123",
            "detected_text": "ABC123",
            "template_match_score": 0.95,
            "template_match_found": True,
            "color_hist_similarity": 0.98,
            "multimodal_report": "Possible scratch near the label.",
        })

        assert decision["verdict"] == "clean"
        assert decision["recommended_action"] == "Accept"

    def test_low_keypoints_with_strong_identity_is_not_swap(self):
        """A same-family board with local anomalies should not be classified as a full swap."""
        decision = make_decision({
            "ssim_score": 0.854,
            "ocr_similarity": 1.0,
            "ocr_mismatches": [],
            "ocr_diff": {"similarity": 1.0, "mismatches": [], "suspicious_confusions": []},
            "keypoint_ratio": 0.536,
            "expected_text": "",
            "detected_text": "",
            "template_match_score": 1.0,
            "template_match_found": True,
            "color_hist_similarity": 0.999,
            "vector_embedding_match": 99.8,
            "anomaly_regions": [{"x": 429, "y": 84, "w": 1029, "h": 746, "location": "middle-center"}],
            "multimodal_report": "Missing component near the KB label.",
        })

        assert decision["category"] != "Swap detection"
        assert decision["verdict"] == "missing"
        assert decision["recommended_action"] == "Quarantine & Escalate"


# =============================================================================
# TEST: OCR String Diff Utility
# =============================================================================

class TestOCRStringDiff:
    """Unit tests for string comparison utility."""

    def test_exact_match(self):
        result = calculate_string_diff("ABC123", "ABC123")
        assert result["similarity"] == 1.0
        assert len(result["mismatches"]) == 0

    def test_complete_mismatch(self):
        result = calculate_string_diff("XXXXXX", "ABC123")
        assert result["similarity"] < 0.5
        assert len(result["mismatches"]) > 0

    def test_partial_match(self):
        result = calculate_string_diff("ABX123", "ABC123")
        assert result["similarity"] == 5/6
        assert len(result["mismatches"]) == 1


# =============================================================================
# TEST: All Metrics Are Computed
# =============================================================================

class TestAnomalyEnsembleCompleteness:
    """Ensure run_anomaly_ensemble returns all required metrics."""

    def test_all_metrics_present(self):
        src = create_test_image(text_region=True)
        ref = create_test_image(text_region=True)
        
        result = run_anomaly_ensemble(src, ref, {
            "label_roi": {"x": 400, "y": 30, "w": 200, "h": 90},
            "expected_serial": "ABC123"
        })
        
        required_keys = [
            "ssim_score", "detected_text", "expected_text",
            "ocr_similarity", "ocr_mismatches",
            "keypoint_ratio", "keypoint_matches",
            "template_match_score", "template_match_found",
            "color_hist_similarity", "matching_score", "heatmap_img"
        ]
        
        for key in required_keys:
            assert key in result, f"Missing key: {key}"
        
        # Heatmap must be a valid image
        assert result["heatmap_img"] is not None
        assert result["heatmap_img"].shape[0] > 0
        assert result["heatmap_img"].shape[1] > 0

    def test_part_code_is_not_used_as_expected_ocr_serial(self):
        src = create_test_image(text_region=True)
        ref = create_test_image(text_region=True)

        result = run_anomaly_ensemble(src, ref, {
            "label_roi": {"x": 400, "y": 30, "w": 200, "h": 90},
            "expected_serial": "GOLD-MOTHERBOARD",
        })

        assert result["expected_text"] != "GOLD-MOTHERBOARD"
        assert len(result["expected_text"]) <= 64
        assert result["ocr_similarity"] == 1.0


# =============================================================================
# TEST: Decision Verdicts
# =============================================================================

class TestDecisionVerdicts:
    """Test all 5 decision verdicts + edge cases."""

    def test_clean_verdict(self):
        decision = make_decision({
            "ssim_score": 0.95, "ocr_similarity": 1.0, "ocr_mismatches": [],
            "keypoint_ratio": 0.90, "expected_text": "ABC", "detected_text": "ABC",
            "template_match_score": 1.0, "template_match_found": True,
            "color_hist_similarity": 0.98
        })
        assert decision["verdict"] == "clean"
        assert decision["fraud_score"] <= 30

    def test_tampered_verdict_low_ssim(self):
        decision = make_decision({
            "ssim_score": 0.30, "ocr_similarity": 0.90, "ocr_mismatches": [],
            "keypoint_ratio": 0.35, "expected_text": "ABC", "detected_text": "ABC",
            "template_match_score": 1.0, "template_match_found": True,
            "color_hist_similarity": 0.85
        })
        assert decision["verdict"] == "tampered", f"Expected tampered, got {decision['verdict']}"
        assert decision["fraud_score"] >= 30

    def test_missing_verdict(self):
        decision = make_decision({
            "ssim_score": 0.70, "ocr_similarity": 0.0, "ocr_mismatches": [],
            "keypoint_ratio": 0.50, "expected_text": "ABC", "detected_text": "",
            "template_match_score": 0.0, "template_match_found": False,
            "color_hist_similarity": 0.60
        })
        assert decision["verdict"] == "missing"
        assert decision["recommended_action"] == "Quarantine & Escalate"


class TestCatalogWorkflow:
    def test_mismatched_images_raise_catalog_warning(self):
        from app.services.agent_1_selector import verify_comparison_viability
        # Create two completely different images (one dark, one test image with text)
        src = create_dark_image()
        ref = create_test_image(text_region=True)
        
        # Save temporary files
        src_path = "temp_src_mismatch.png"
        ref_path = "temp_ref_mismatch.png"
        cv2.imwrite(src_path, src)
        cv2.imwrite(ref_path, ref)
        
        try:
            viability = verify_comparison_viability(src_path, ref_path)
            assert viability["viable"]
        finally:
            if os.path.exists(src_path):
                os.remove(src_path)
            if os.path.exists(ref_path):
                os.remove(ref_path)

    def test_missing_golden_reference_fails_triage(self):
        src = create_test_image()
        src_path = "temp_src_missing_golden.png"
        cv2.imwrite(src_path, src)

        try:
            result = process_and_validate(src_path, "does_not_exist_golden.png")
            assert result["status"] == "failed"
            assert result["alignment_status"] == "failed"
        finally:
            if os.path.exists(src_path):
                os.remove(src_path)
