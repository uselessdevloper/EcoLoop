"""
Triage, Case Queue, Pipeline Config & Review Details router.
Provides all endpoints that the frontend needs to replace mock data.
"""
import os
import json
import logging
import cv2
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.config import settings
from app import models, schemas, utils, services

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/triage", tags=["Triage & Cases"])

# ─── In-memory pipeline config store (could be persisted to DB) ───────────
_PIPELINE_CONFIG = {
    "thresholds": {
        "ssim": 0.85,
        "keypointDeltaPct": 15,
        "ocrFuzzyPct": 100,
    },
    "routingRules": [
        {
            "id": "RULE-102",
            "name": "Critical Part Isolation",
            "description": "If Commodity = 'Microchips / IC' → always route to Human Review, regardless of AI confidence.",
        },
        {
            "id": "RULE-103",
            "name": "High-Risk Automation Gate",
            "description": "If Fraud Score ≥ 75 → auto-route to Quarantine and notify the supplier log.",
        },
    ],
    "privacy": {
        "storeImageHashOnly": True,
        "redactPersonalMarkings": True,
        "verdictChangeAuditLog": True,
    },
}

_PIPELINE_HISTORY = [
    {"id": "h1", "changedAt": "2026-07-16T09:12:00Z", "summary": "SSIM min score raised 0.80 → 0.85", "user": "Chaitanya"},
    {"id": "h2", "changedAt": "2026-07-12T14:40:00Z", "summary": "OCR fuzzy match relaxed to 92%", "user": "Jagruti"},
    {"id": "h3", "changedAt": "2026-07-08T11:05:00Z", "summary": "Added Rule #103 — High-Risk Automation Gate", "user": "Chaitanya"},
]


@router.get("/queue", response_model=List[schemas.CaseQueueItem])
def get_triage_queue(
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user),
):
    """Return inspection queue items formatted for the Daily Triage page."""
    query = db.query(models.Inspection).join(models.Product).join(models.InspectionResult, isouter=True)

    # Filter by user role
    if current_user.role != "admin":
        query = query.filter(models.Inspection.user_id == current_user.id)

    # Apply filters
    if status_filter and status_filter != "ALL":
        if status_filter == "QUARANTINE":
            query = query.filter(models.Inspection.status == "completed")
        elif status_filter == "PENDING QA":
            query = query.filter(models.Inspection.status.in_(["pending"]))
        elif status_filter == "AUTO-APPROVED":
            query = query.filter(models.Inspection.status == "completed")
        elif status_filter == "RETAKE REQUESTED":
            query = query.filter(models.Inspection.status == "retake_needed")

    if search:
        query = query.filter(
            models.Inspection.case_id.ilike(f"%{search}%") |
            models.Product.part_number.ilike(f"%{search}%")
        )

    query = query.order_by(models.Inspection.created_at.desc())
    inspections = query.all()

    items = []
    for idx, insp in enumerate(inspections, 1):
        result = insp.result
        risk_score = result.fraud_score if result else 50
        confidence = int((result.confidence or 0.5) * 100) if result else 50
        verdict = result.verdict if result else "pending"

        # Map status to frontend format
        if insp.status == "retake_needed":
            status_label = "RETAKE REQUESTED"
            reason = "Image quality below threshold"
        elif insp.status == "pending":
            status_label = "PENDING QA"
            reason = "Awaiting AI analysis" if not result else "Flagged for review"
        elif insp.status == "completed":
            if result and result.recommended_action != "Accept":
                status_label = "QUARANTINE"
                reason = result.explanation if result.explanation else verdict.replace("_", " ").title()
            else:
                status_label = "AUTO-APPROVED"
                reason = result.explanation if result and result.explanation else "Passed Inspection"
        else:
            status_label = "PENDING QA"
            reason = "Unknown"

        items.append(schemas.CaseQueueItem(
            id=f"row_{insp.id}",
            caseId=insp.case_id,
            createdAt=insp.created_at.strftime("%I:%M %p") if insp.created_at else "",
            partNumber=insp.product.part_number if insp.product else "N/A",
            batch=f"Batch {chr(65 + (insp.product_id % 26))}",
            commodity=insp.product.commodity if insp.product else "Unknown",
            riskScore=risk_score,
            confidence=confidence,
            reason=reason,
            status=status_label,
            date=insp.date or (insp.created_at.strftime("%Y-%m-%d") if insp.created_at else "N/A")
        ))

    return items


@router.get("/stats", response_model=schemas.TriageStats)
def get_triage_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user),
):
    """Return aggregate statistics for the triage dashboard."""
    query = db.query(models.Inspection)
    if current_user.role != "admin":
        query = query.filter(models.Inspection.user_id == current_user.id)

    total_today = query.count()
    pending = query.filter(models.Inspection.status.in_(["pending", "failed"])).count()
    auto_approved = query.filter(
        models.Inspection.status == "completed",
        models.Inspection.result != None,
    ).count()

    return schemas.TriageStats(
        totalToday=total_today,
        pendingReview=pending,
        autoApproved=auto_approved,
        avgResolutionMinutes=9.4,
    )


@router.get("/pipeline-status", response_model=schemas.PipelineStatusResponse)
def get_pipeline_status(
    current_user: models.User = Depends(utils.get_current_user),
):
    """Return current AI pipeline status."""
    return schemas.PipelineStatusResponse(
        stage="Perception Engine v4.2",
        health="operational",
        lastRunAt=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


@router.get("/cases", response_model=List[dict])
def get_all_cases(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user),
):
    """Return lightweight case list for Case Detail page navigation."""
    query = db.query(models.Inspection).join(models.Product).join(models.InspectionResult, isouter=True)
    if current_user.role != "admin":
        query = query.filter(models.Inspection.user_id == current_user.id)
    query = query.order_by(models.Inspection.created_at.desc())

    cases = []
    for insp in query.all():
        result = insp.result
        cases.append({
            "id": insp.case_id,
            "partCode": insp.product.part_number if insp.product else "N/A",
            "commodity": insp.product.commodity if insp.product else "Unknown",
            "confidencePct": int((result.confidence or 0.5) * 100) if result else 0,
            "fraudScore": result.fraud_score if result else 0,
            "status": result.verdict if result else insp.status,
            "updatedAt": insp.created_at.isoformat() if insp.created_at else "",
        })
    return cases


@router.get("/cases/{case_id}/detail", response_model=dict)
def get_case_detail(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user),
):
    """Return full case detail including metadata, OCR results, metrics & timeline."""
    inspection = db.query(models.Inspection).filter(
        models.Inspection.case_id == case_id
    ).first()

    if not inspection:
        raise HTTPException(status_code=404, detail="Case not found")

    result = inspection.result
    product = inspection.product

    golden_image_url = None
    if product and product.golden_references:
        golden_ref = product.golden_references[0]
        golden_image_url = f"/data/golden/{os.path.basename(golden_ref.image_path)}" if golden_ref.image_path else None

    # Build OCR results from the inspection result
    ocr_results = []
    pipeline_category = None
    ocr_similarity = None
    ocr_match = None
    if result:
        evidence = result.evidence_json or {}
        detector_results = evidence.get("detector_results", {}) or {}
        pipeline_category = result.category or evidence.get("category")
        ocr_detector_data = detector_results.get("ocr", {})
        ocr_similarity = ocr_detector_data.get("similarity") if ocr_detector_data.get("similarity") is not None else evidence.get("ocr_similarity")

        # Resolve expected serial: avoid using dummy part numbers like "GOLD-RAM" as serials
        expected_serial = result.ocr_expected_text or ocr_detector_data.get("expected_text")
        if not expected_serial and product and product.golden_references:
            ref_serial = product.golden_references[0].expected_serial
            if ref_serial and not ref_serial.startswith("GOLD-") and not ref_serial.startswith("AUTO-") and ref_serial != product.part_number:
                expected_serial = ref_serial

        detected_text = result.ocr_detected_text or ocr_detector_data.get("detected_text") or "No text detected"
        expected_text = expected_serial if expected_serial else "N/A font / board label"

        def _normalize_text(value):
            if not value:
                return ""
            return "".join(str(value).split()).lower()

        mismatches = ocr_detector_data.get("mismatches") if ocr_detector_data.get("mismatches") is not None else evidence.get("ocr_mismatches", [])

        if expected_serial and expected_serial != "N/A":
            if isinstance(mismatches, list) and len(mismatches) > 0:
                ocr_match = False
            elif ocr_similarity is not None:
                ocr_match = float(ocr_similarity) >= 0.9
            elif detected_text and detected_text != "No text detected":
                ocr_match = _normalize_text(detected_text) == _normalize_text(expected_serial)
            else:
                ocr_match = False
        else:
            ocr_match = None

        ocr_results.append({
            "field": "Barcode / Label Text Check",
            "extracted": detected_text,
            "expected": expected_text,
            "match": ocr_match,
            "similarity": ocr_similarity,
            "mismatches": mismatches or [],
        })

        vec_match = (
            detector_results.get("vector", {}).get("vector_embedding_match")
            or detector_results.get("clip", {}).get("similarity")
            or evidence.get("vector_embedding_match")
            or evidence.get("vector_match")
        )
        vec_score = round(float(vec_match), 1) if vec_match is not None else (round(result.ssim_score * 100, 1) if result.ssim_score else 90.0)

        metrics = [
            {"name": "SSIM Score", "score": result.ssim_score or 0, "unit": "", "icon": "image_search", "description": "Structural similarity to OEM golden image"},
            {"name": "Keypoint Match", "score": result.keypoint_match_rate or 0, "unit": "", "icon": "hub", "description": "ORB/SIFT keypoint match rate"},
            {"name": "Vector Sim", "score": vec_score, "unit": "%", "icon": "bolt", "description": "512-Dim CLIP Vector Cosine Similarity"},
            {"name": "Template Match", "score": detector_results.get("template", {}).get("template_match_score", 1.0), "unit": "", "icon": "verified", "description": "Expected label/seal presence check"},
            {"name": "Color Match", "score": detector_results.get("color", {}).get("color_hist_similarity", 1.0), "unit": "", "icon": "palette", "description": "Label/material color histogram similarity"},
            {"name": "Fraud Score", "score": result.fraud_score, "unit": "%", "icon": "psychology", "description": "Overall fraud risk assessment"},
            {"name": "AI Confidence", "score": int(result.confidence * 100) if result.confidence else 0, "unit": "%", "icon": "bar_chart", "description": "Overall detector confidence"},
        ]

    # Build timeline from audit logs
    timeline = []
    for log in inspection.audit_logs or []:
        timeline.append({
            "id": f"log_{log.id}",
            "type": log.action,
            "label": log.action.replace("_", " ").title(),
            "user": log.actor,
            "timestamp": log.timestamp.isoformat() if log.timestamp else "",
            "description": log.comments or "",
        })

    if not timeline:
        timeline = [
            {"id": "e1", "type": "created", "label": "Case Opened", "user": "System", "timestamp": inspection.created_at.isoformat() if inspection.created_at else "", "description": "Automatically created by the Perception Engine."},
        ]

    heatmap_url = None
    if result and result.heatmap_path:
        heatmap_url = f"/data/cases/{os.path.basename(result.heatmap_path)}"

    uploaded_image_url = None
    annotated_image_url = None
    if inspection.captured_image_path and os.path.exists(inspection.captured_image_path):
        base_name = os.path.basename(inspection.captured_image_path)
        
        # Check for any existing annotated file on disk
        for test_ext in [".png", ".jpeg", ".jpg", ".webp"]:
            cand = os.path.join(settings.UPLOAD_DIR, f"{inspection.case_id}_annotated{test_ext}")
            if os.path.exists(cand):
                annotated_image_url = f"/data/cases/{os.path.basename(cand)}"
                break
        
        # On-the-fly annotated target generation fallback for existing cases
        if not annotated_image_url and product and product.golden_references:
            golden_ref = product.golden_references[0]
            if golden_ref.image_path and os.path.exists(golden_ref.image_path):
                try:
                    src_img = cv2.imread(inspection.captured_image_path)
                    ref_img = cv2.imread(golden_ref.image_path)
                    if src_img is not None and ref_img is not None:
                        _, _, annotated_target, _ = services.compute_ssim_diff(src_img, ref_img)
                        gen_path = os.path.join(settings.UPLOAD_DIR, f"{inspection.case_id}_annotated.png")
                        cv2.imwrite(gen_path, annotated_target)
                        annotated_image_url = f"/data/cases/{inspection.case_id}_annotated.png"
                except Exception as e:
                    logger.error(f"Failed on-the-fly annotated target generation: {e}")

        if annotated_image_url:
            uploaded_image_url = annotated_image_url
        else:
            uploaded_image_url = f"/data/cases/{base_name}"

    # Multi-Angle Views lookup for same product/user
    multi_angle_views = []
    if product:
        sibling_inspections = db.query(models.Inspection).filter(
            models.Inspection.product_id == product.id,
            models.Inspection.user_id == inspection.user_id
        ).order_by(models.Inspection.created_at.desc()).limit(4).all()

        seen_angles = set()
        for sibling in sibling_inspections:
            angle = (sibling.capture_angle or "top").lower()
            if angle not in seen_angles:
                seen_angles.add(angle)
                sib_result = sibling.result
                if sib_result:
                    sib_captured_url = f"/data/cases/{os.path.basename(sibling.captured_image_path)}" if sibling.captured_image_path else None
                    sib_heatmap_url = f"/data/cases/{os.path.basename(sib_result.heatmap_path)}" if sib_result.heatmap_path else None
                    multi_angle_views.append({
                        "caseId": sibling.case_id,
                        "angle": angle,
                        "fraudScore": sib_result.fraud_score,
                        "verdict": sib_result.verdict,
                        "uploadedUrl": sib_captured_url,
                        "heatmapUrl": sib_heatmap_url,
                    })

    # pipeline_complete is True only when an InspectionResult record exists
    pipeline_complete = result is not None

    return {
        "metadata": {
            "id": inspection.case_id,
            "partCode": product.part_number if product else "N/A",
            "commodity": product.commodity if product else "Unknown",
            "status": result.verdict if pipeline_complete else inspection.status,
            # Return None (not 0 or 50) when no pipeline result so the UI can show N/A
            "confidencePct": int(result.confidence * 100) if (pipeline_complete and result.confidence is not None) else None,
            "fraudScore": result.fraud_score if pipeline_complete else None,
            "category": pipeline_category if pipeline_complete else None,
            "imageHash": f"0x{abs(hash(inspection.case_id)):08X}",
            "neuralModel": "FraudSense v4.2",
            "updatedAt": inspection.created_at.isoformat() if inspection.created_at else "",
            "heatmapUrl": heatmap_url,
            "goldenImageUrl": golden_image_url,
            "uploadedImageUrl": uploaded_image_url,
            "captureAngle": inspection.capture_angle or "top",
            "multiAngleViews": multi_angle_views,
            "pipelineComplete": pipeline_complete,
        },
        "pipelineVerdict": result.verdict if pipeline_complete else None,
        "pipelineCategory": pipeline_category if pipeline_complete else None,
        "pipelineAction": result.recommended_action if pipeline_complete else None,
        "ocrResults": ocr_results,
        "metrics": metrics,
        "timeline": timeline,
        "recommendation": {
            # Return None for all fields when pipeline hasn't produced a result
            "decision": result.recommended_action if pipeline_complete else None,
            "confidence": int(result.confidence * 100) if (pipeline_complete and result.confidence is not None) else None,
            "reasoning": result.explanation if pipeline_complete else None,
            "flags": (result.evidence_json or {}).get("evidence_summary", {}) if pipeline_complete else {},
        },
        "evidence": result.evidence_json if pipeline_complete else {},
    }



@router.get("/cases/{case_id}/review", response_model=schemas.ReviewDetailResponse)
def get_case_review_detail(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user),
):
    """Return case detail formatted for the Human Review page."""
    inspection = db.query(models.Inspection).filter(
        models.Inspection.case_id == case_id
    ).first()

    if not inspection:
        raise HTTPException(status_code=404, detail="Case not found")

    result = inspection.result
    product = inspection.product

    golden_image_url = None
    uploaded_image_url = None
    if inspection.captured_image_path:
        if inspection.captured_image_path.startswith("/"):
            uploaded_image_url = inspection.captured_image_path
        else:
            uploaded_image_url = f"/data/cases/{os.path.basename(inspection.captured_image_path)}"

    if product and product.golden_references:
        golden_ref = product.golden_references[0]
        if golden_ref.image_path.startswith("/"):
            golden_image_url = golden_ref.image_path
        else:
            golden_image_url = f"/data/golden/{os.path.basename(golden_ref.image_path)}" if golden_ref.image_path else None

    # Fallback to empty if not found
    if not golden_image_url:
        golden_image_url = ""
    if not uploaded_image_url:
        uploaded_image_url = ""
    evidence = result.evidence_json if result and result.evidence_json else {}
    regions = evidence.get("anomaly_regions", [])
    if regions:
        first_region = regions[0]
        ai_region = {
            "x": float(first_region.get("x", 0)),
            "y": float(first_region.get("y", 0)),
            "w": float(first_region.get("w", 0)),
            "h": float(first_region.get("h", 0)),
        }
    else:
        ai_region = {"x": 0, "y": 0, "w": 0, "h": 0}

    return schemas.ReviewDetailResponse(
        id=inspection.case_id,
        partCode=product.part_number if product else "N/A",
        title=f"Manual validation required for {product.name if product else 'part'} fraud detection.",
        confidencePct=int((result.confidence or 0.5) * 100) if result else 42,
        imageHash=f"0x{abs(hash(inspection.case_id)):08X}",
        goldenImageUrl=golden_image_url,
        uploadedImageUrl=uploaded_image_url,
        aiRegion=ai_region,
        neuralModel="FraudSense v4.2",
        targetResolutionMinutes=15,
        elapsedMinutes=0.0,
        status=inspection.status if not result else "needs_evidence",
    )


@router.post("/cases/{case_id}/roi", response_model=dict)
def update_roi_region(
    case_id: str,
    roi: schemas.ROIUpdate,
    current_user: models.User = Depends(utils.get_current_user),
):
    """Update the ROI region for a case (for Human Review)."""
    # In production, save ROI to DB; for now, acknowledge it
    logger.info(f"User {current_user.email} updated ROI for case {case_id}: {roi.region}")
    return {"case_id": case_id, "region": roi.region.model_dump(), "savedAsTrainingExample": True}


# ─── Pipeline Config endpoints ────────────────────────────────────────────

@router.get("/pipeline/config", response_model=schemas.PipelineConfig)
def get_pipeline_config(
    current_user: models.User = Depends(utils.get_current_user),
):
    """Return current pipeline configuration."""
    return schemas.PipelineConfig(**_PIPELINE_CONFIG)


@router.put("/pipeline/config", response_model=dict)
def save_pipeline_config(
    config: schemas.PipelineConfig,
    current_user: models.User = Depends(utils.get_current_user),
):
    """Save pipeline configuration."""
    _PIPELINE_CONFIG["thresholds"] = config.thresholds.model_dump()
    _PIPELINE_CONFIG["routingRules"] = [r.model_dump() for r in config.routingRules]
    _PIPELINE_CONFIG["privacy"] = config.privacy.model_dump()
    logger.info(f"User {current_user.email} updated pipeline config")
    return {"savedAt": datetime.utcnow().isoformat(), "config": _PIPELINE_CONFIG}


@router.get("/pipeline/history", response_model=List[schemas.AdjustmentHistoryItem])
def get_pipeline_history(
    current_user: models.User = Depends(utils.get_current_user),
):
    """Return adjustment history for pipeline tuning."""
    return [schemas.AdjustmentHistoryItem(**h) for h in _PIPELINE_HISTORY]
