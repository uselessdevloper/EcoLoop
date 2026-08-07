import os
import shutil
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

import logging
from app.database import get_db
from app.config import settings
from app import models, schemas, utils, services
from app.agents.workflow import run_inspection_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inspections", tags=["Inspections"])

@router.get("/catalog", response_model=List[schemas.ProductResponse])
def get_catalog_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """
    Returns all pre-registered Golden Catalog reference standards.
    """
    logger.info(f"User {current_user.email} fetching Golden Catalog references list.")
    products = db.query(models.Product).all()
    return products

@router.post("", response_model=schemas.InspectionResponse, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    capture_site: str = Form(...),
    capture_angle: str = Form("top"),
    file: UploadFile = File(...),
    golden_file: Optional[UploadFile] = File(None),
    catalog_part_number: Optional[str] = Form(None),
    expected_serial: Optional[str] = Form(None),
    vendor: Optional[str] = Form(None),
    component_name: Optional[str] = Form(None),
    date: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    logger.info(f"Incoming inspection request. Site: {capture_site}, Angle: {capture_angle}, Catalog ID: {catalog_part_number}")
    
    # 1. Read files and validate decoding
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    src_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if src_img is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to decode uploaded captured/defective image scan. Please upload a valid JPG or PNG photo."
        )

    # Validate resolution (min 150x150)
    if src_img.shape[0] < 150 or src_img.shape[1] < 150:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded captured image resolution is too low (minimum 150x150 pixels required)."
        )

    db_product = None
    golden_file_path = ""
    roi_json = None
    detected_commodity = ""

    # 2. Resolve Golden Reference (Catalog standard vs Custom upload)
    if catalog_part_number:
        db_product = db.query(models.Product).filter(models.Product.part_number == catalog_part_number).first()
        if not db_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This part's golden image was not available in our database. Please contact your admin."
            )

        db_golden = db.query(models.GoldenReference).filter(
            models.GoldenReference.product_id == db_product.id
        ).first()

        if not db_golden or not db_golden.image_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This part's golden image was not available in our database. Please contact your admin."
            )

        filename = os.path.basename(db_golden.image_path)
        possible_paths = [
            os.path.join(settings.GOLDEN_DIR, filename),
            os.path.abspath(db_golden.image_path),
            os.path.join(settings.BASE_DIR, db_golden.image_path),
            os.path.join(os.path.dirname(settings.BASE_DIR), "Golden_Images", filename),
        ]
        golden_file_path = None
        for p in possible_paths:
            if os.path.exists(p):
                golden_file_path = p
                break

        # Fallback copy if file is in Golden_Images directory
        if not golden_file_path:
            project_root = os.path.dirname(settings.BASE_DIR)
            for fname in [filename, f"golden_{db_product.part_number.lower()}.png"]:
                candidate = os.path.join(project_root, "Golden_Images", fname)
                if os.path.exists(candidate):
                    target_p = os.path.join(settings.GOLDEN_DIR, filename)
                    os.makedirs(settings.GOLDEN_DIR, exist_ok=True)
                    shutil.copy(candidate, target_p)
                    golden_file_path = target_p
                    break

        if not golden_file_path or not os.path.exists(golden_file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This part's golden image was not available in our database. Please contact your admin."
            )

        ref_img = utils.load_image_robust(golden_file_path)
        if ref_img is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This part's golden reference image could not be loaded into memory. Please contact your admin."
            )

        detected_commodity = db_product.commodity
        roi_json = db_golden.roi_config
        if not expected_serial:
            expected_serial = db_golden.expected_serial
        golden_file_path = os.path.abspath(golden_file_path)

    else:
        if not golden_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either a pre-registered catalog part number or a custom golden reference image file upload is required."
            )

        golden_contents = await golden_file.read()
        nparr_golden = np.frombuffer(golden_contents, np.uint8)
        ref_img = cv2.imdecode(nparr_golden, cv2.IMREAD_COLOR)

        if ref_img is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode uploaded golden reference standard image. Please upload a valid JPG or PNG photo."
            )

        if ref_img.shape[0] < 150 or ref_img.shape[1] < 150:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded golden reference image resolution is too low (minimum 150x150 pixels required)."
            )

        # Save dynamic Golden Reference file to settings.GOLDEN_DIR
        golden_id = str(uuid.uuid4())
        golden_ext = os.path.splitext(golden_file.filename)[1] or ".png"
        golden_filename = f"golden_{golden_id}{golden_ext}"
        golden_file_path = os.path.join(settings.GOLDEN_DIR, golden_filename)
        
        logger.info(f"Saving uploaded golden reference standard image to {golden_file_path}")
        try:
            with open(golden_file_path, "wb") as f:
                f.write(golden_contents)
        except Exception as e:
            logger.error(f"Failed to save golden image standard: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save golden reference image standard on server: {str(e)}"
            )

        # Auto-classify the commodity of the golden standard
        detected_commodity = services.classify_part_commodity(golden_file_path)
        logger.info(f"Part commodity dynamically classified as: '{detected_commodity}'")

        # Set up default ROI configuration based on the detected commodity
        if detected_commodity == "label":
            roi_json = { "label_roi": { "x": 420, "y": 50, "width": 420, "height": 220 } }
        elif detected_commodity == "motherboard":
            roi_json = { "label_roi": { "x": 200, "y": 620, "width": 150, "height": 80 } }
        elif detected_commodity == "microchip":
            roi_json = { "label_roi": { "x": 250, "y": 250, "width": 200, "height": 100 } }
        else:
            roi_json = { "label_roi": { "x": 100, "y": 100, "width": 300, "height": 200 } }

        # Dynamically register Product in Database
        custom_part_num = f"AUTO-{uuid.uuid4().hex[:6].upper()}"
        custom_name = component_name.strip() if component_name else f"Auto-detected {detected_commodity.title()} ({file.filename})"
        
        db_product = models.Product(
            part_number=custom_part_num,
            name=custom_name,
            commodity=detected_commodity
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        
        # Register Golden Reference in Database
        db_golden = models.GoldenReference(
            product_id=db_product.id,
            image_path=f"data/golden/{golden_filename}",
            expected_serial=expected_serial,
            angle=capture_angle,
            roi_config=roi_json
        )
        db.add(db_golden)
        db.commit()
        db.refresh(db_golden)

    # 6. Save uploaded target defect scan
    case_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] or ".png"
    filename = f"{case_id}_captured{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    logger.info(f"Saving uploaded inspection image to {file_path} (Case ID: {case_id})")
    try:
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        logger.error(f"Failed to save image for Case {case_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to save uploaded target image: {str(e)}"
        )

    # 7. Initialize Database Inspection record as pending
    db_inspection = models.Inspection(
        case_id=case_id,
        product_id=db_product.id,
        user_id=current_user.id,
        captured_image_path=file_path,
        capture_site=capture_site,
        capture_angle=capture_angle,
        vendor=vendor.strip() if vendor else None,
        component_name=component_name.strip() if component_name else None,
        date=date.strip() if date else None,
        status="pending"
    )
    db.add(db_inspection)
    db.commit()
    db.refresh(db_inspection)

    # 8. Run Ingestion, Alignment & Anomaly Detection using the LangGraph Workflow
    initial_state = {
        "case_id": case_id,
        "image_path": file_path,
        "golden_path": golden_file_path,
        "expected_serial": expected_serial,
        "roi_config": roi_json,
        "commodity": detected_commodity
    }

    
    logger.info(f"Triggering LangGraph Multi-Agent pipeline for Case {case_id}")
    try:
        pipeline_result = run_inspection_pipeline(initial_state)
    except Exception as e:
        logger.error(f"LangGraph execution crashed for Case {case_id}: {str(e)}")
        db_inspection.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inspection pipeline execution failed: {str(e)}"
        )
        
    if pipeline_result["status"] == "retake_needed":
        logger.warning(f"Triage verification failed for Case {case_id}: {pipeline_result['triage_detail']}")
        db_inspection.status = "retake_needed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": pipeline_result["triage_detail"],
                "case_id": case_id,
                "status": "retake_needed"
            }
        )
        
    if pipeline_result["status"] == "failed":
        logger.error(f"Pipeline status reported failure for Case {case_id}")
        db_inspection.status = "failed"
        db.commit()
        detail_msg = pipeline_result.get("triage_detail", "Internal engine failure during inspection processing.")
        if any(k in detail_msg.lower() for k in ["mismatch", "ratio", "scale", "orientation", "comparison"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail_msg
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail_msg
        )


    logger.info(f"Pipeline succeeded. Verdict: {pipeline_result['verdict']}, Fraud Score: {pipeline_result['fraud_score']}")

    evidence_json = {
        "detector_results": pipeline_result.get("detector_results", {}),
        "anomaly_regions": pipeline_result.get("anomaly_regions", []),
        "ocr_diff": pipeline_result.get("ocr_diff", {}),
        "thresholds_used": pipeline_result.get("thresholds_used", {}),
        "evidence_summary": pipeline_result.get("evidence_summary", {}),
        "alignment": {
            "status": pipeline_result.get("alignment_status"),
            "rate": pipeline_result.get("alignment_rate"),
            "detail": pipeline_result.get("triage_detail"),
        },
        "multimodal_report": pipeline_result.get("multimodal_report"),
    }

    # 6. Commit results to Database
    db_result = models.InspectionResult(
        inspection_id=db_inspection.id,
        ssim_score=pipeline_result["ssim_score"],
        keypoint_match_rate=pipeline_result.get("keypoint_ratio"),
        ocr_detected_text=pipeline_result["ocr_detected_text"],
        ocr_expected_text=pipeline_result["ocr_expected_text"],
        fraud_score=pipeline_result["fraud_score"],
        verdict=pipeline_result["verdict"],
        category=pipeline_result.get("category"),
        confidence=pipeline_result["confidence"],
        recommended_action=pipeline_result["recommended_action"],
        explanation=pipeline_result["explanation"],
        heatmap_path=pipeline_result["heatmap_path"],
        diagnostic_path=pipeline_result.get("diagnostic_path"),
        evidence_json=evidence_json
    )
    db.add(db_result)

    # Mark inspection status completed
    db_inspection.status = "completed"
    db.commit()
    db.refresh(db_inspection)

    return db_inspection

@router.get("", response_model=List[schemas.InspectionResponse])
def list_inspections(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    logger.info(f"User {current_user.email} listing inspections (Role: {current_user.role})")
    if current_user.role == "admin":
        return db.query(models.Inspection).order_by(models.Inspection.created_at.desc()).all()
    else:
        return db.query(models.Inspection).filter(
            models.Inspection.user_id == current_user.id
        ).order_by(models.Inspection.created_at.desc()).all()

@router.get("/{case_id}", response_model=schemas.InspectionResponse)
def get_inspection_by_case(
    case_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    logger.info(f"User {current_user.email} requesting details for case: {case_id}")
    inspection = db.query(models.Inspection).filter(models.Inspection.case_id == case_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection case not found")
        
    # Authorization verification: Admin can read all, Normal user only their own
    if current_user.role != "admin" and inspection.user_id != current_user.id:
        logger.warning(f"Unauthorized access attempt by user {current_user.email} for case: {case_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this inspection case details."
        )
        
    return inspection


@router.delete("/{case_id}", status_code=status.HTTP_200_OK)
def delete_inspection(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """Delete an inspection case, its linked results, audit logs, and reports."""
    inspection = db.query(models.Inspection).filter(models.Inspection.case_id == case_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection case not found")
        
    # Authorization verification: Admin can delete all, Normal user only their own
    if current_user.role != "admin" and inspection.user_id != current_user.id:
        logger.warning(f"Unauthorized delete attempt by user {current_user.email} for case: {case_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this inspection case."
        )
        
    try:
        # Delete related reports
        db.query(models.Report).filter(models.Report.inspection_id == inspection.id).delete()
        # Delete related audit logs
        db.query(models.AuditLog).filter(models.AuditLog.inspection_id == inspection.id).delete()
        # Delete related results
        db.query(models.InspectionResult).filter(models.InspectionResult.inspection_id == inspection.id).delete()
        # Delete main inspection record
        db.delete(inspection)
        db.commit()
        logger.info(f"User {current_user.email} deleted case {case_id}")
        return {"message": "Inspection case deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete inspection case {case_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete inspection case: {str(e)}")


@router.post("/multi-angle-fusion")
def get_multi_angle_fusion(
    payload: schemas.MultiAngleFusionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """
    Multi-Angle Fusion API (Bonus Challenge):
    Receives 2-3 case IDs representing different capture angles of the same part.
    Calculates combined fused fraud score, joint confidence, and aggregated verdict.
    """
    case_ids = payload.case_ids
    if not case_ids or len(case_ids) < 1:
        raise HTTPException(status_code=400, detail="At least one case_id must be provided for multi-angle fusion.")

    angle_results = []
    for cid in case_ids:
        ins = db.query(models.Inspection).filter(models.Inspection.case_id == cid).first()
        if ins and ins.result:
            angle_results.append({
                "case_id": cid,
                "angle": ins.capture_angle or "top",
                "fraud_score": ins.result.fraud_score,
                "verdict": ins.result.verdict,
                "confidence": ins.result.confidence,
                "recommended_action": ins.result.recommended_action,
                "ssim_score": ins.result.ssim_score,
            })

    if not angle_results:
        raise HTTPException(status_code=404, detail="No valid completed inspection results found for the provided case IDs.")

    fused = services.fuse_multi_angle_decisions(angle_results)
    fused["individual_angles"] = angle_results

    # Update primary inspection record with multi-angle fused decision metadata
    primary_ins = db.query(models.Inspection).filter(models.Inspection.case_id == case_ids[0]).first()
    if primary_ins and primary_ins.result:
        primary_ins.result.fraud_score = fused.get("fused_fraud_score", primary_ins.result.fraud_score)
        primary_ins.result.verdict = fused.get("fused_verdict", primary_ins.result.verdict)
        primary_ins.result.confidence = fused.get("fused_confidence", primary_ins.result.confidence)
        primary_ins.result.recommended_action = fused.get("fused_action", primary_ins.result.recommended_action)
        db.commit()

    return fused


@router.post("/auto-match-golden", response_model=dict)
def auto_match_golden_reference(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user),
):
    """
    Reference Library Vector Embedding Auto-Match Endpoint (Bonus Challenge 3):
    Uploads a target scan photo, extracts 512-dim visual vector embedding,
    runs sub-10ms Cosine Similarity search across the Reference Library,
    and returns the top matching OEM Golden Reference product & confidence score.
    """
    file_ext = os.path.splitext(file.filename)[1]
    temp_filename = f"temp_automatch_{uuid.uuid4()}{file_ext}"
    temp_path = os.path.join(settings.UPLOAD_DIR, temp_filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        match_result = services.auto_select_golden_reference(temp_path, db)
        return match_result
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


