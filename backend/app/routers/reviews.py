from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas, utils

router = APIRouter(prefix="/reviews", tags=["Human Review & Auditing"])

@router.get("/pending", response_model=List[schemas.InspectionResponse])
def get_pending_reviews(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """
    Returns inspections that have low confidence scores (< 0.70) or 
    are flagged with risk actions requiring expert validation.
    """
    # Return inspections that are completed, but either:
    # 1. Have low confidence (e.g., confidence < 0.70)
    # 2. Or final action recommended is not simple acceptance (Borderline / Quarantine)
    return db.query(models.Inspection)\
        .join(models.InspectionResult)\
        .filter(
            models.Inspection.status == "completed",
            (models.InspectionResult.confidence < 0.70) | 
            (models.InspectionResult.recommended_action != "Accept")
        ).all()

@router.post("/{case_id}", response_model=schemas.InspectionResponse)
def submit_review_decision(
    case_id: str,
    review: schemas.ReviewAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """
    Submit approval, rejection, or override verdict for a case.
    Creates an Audit Log tracking user changes.
    """
    inspection = db.query(models.Inspection).filter(models.Inspection.case_id == case_id).first()
    if not inspection or not inspection.result:
        raise HTTPException(status_code=404, detail="Inspection case or results not found")

    res = inspection.result
    prev_verdict = res.verdict
    new_verdict = prev_verdict

    # Check review actions
    if review.action == "approve":
        # Keep AI decisions, bump confidence to 1.0 (validated by QA)
        res.confidence = 1.0
        res.recommended_action = "Accept" if res.verdict == "clean" else res.recommended_action
    
    elif review.action == "reject":
        new_verdict = "tampered"
        res.verdict = new_verdict
        res.confidence = 1.0  # Confirmed by reviewer
        res.recommended_action = "Quarantine & Escalate"
        res.fraud_score = 95  # High score for explicit reviewer rejection
        
    elif review.action == "override":
        if not review.override_verdict:
            raise HTTPException(status_code=400, detail="Override verdict is required for override action")
        
        new_verdict = review.override_verdict
        res.verdict = new_verdict
        res.confidence = 1.0  # Confirmed by reviewer
        
        # Adjust recommended action based on new overridden verdict
        if new_verdict == "clean":
            res.recommended_action = "Accept"
            res.fraud_score = 10  # Low score for overridden Clean
        else:
            res.recommended_action = "Quarantine & Escalate"
            res.fraud_score = 90  # High score for overridden anomaly

    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'approve', 'reject' or 'override'")

    # Create Audit Log record
    log_entry = models.AuditLog(
        inspection_id=inspection.id,
        actor=current_user.email,
        action=f"review_{review.action}",
        comments=review.comments,
        previous_verdict=prev_verdict,
        new_verdict=new_verdict
    )
    db.add(log_entry)
    db.commit()
    db.refresh(inspection)

    return inspection
