import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils, services

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])

@router.get("/{case_id}/pdf")
def get_pdf_report(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    """
    Generates and returns the PDF audit report for the inspection case.
    """
    inspection = db.query(models.Inspection).filter(models.Inspection.case_id == case_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection case not found")
    
    # Authorization verification: Admin can read all, Normal user only their own
    if current_user.role != "admin" and inspection.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this inspection report."
        )

    if not inspection.result:
        raise HTTPException(status_code=400, detail="Inspection has no result data yet")

    try:
        # Generate the PDF file (or locate existing one)
        pdf_path = services.generate_pdf_report(inspection.id, db)
        
        # Verify file exists
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=500, detail="Generated report file not found on disk")

        # Determine media type depending on file format (ReportLab fallback might output .txt)
        media_type = "application/pdf"
        filename = f"VeriVision_Report_{case_id}.pdf"
        if pdf_path.endswith(".txt"):
            media_type = "text/plain"
            filename = f"VeriVision_Report_{case_id}.txt"

        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type=media_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF report: {str(e)}")

@router.get("/export/csv")
def export_csv_report(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.require_role(["admin"]))
):
    """
    Generates and returns a bulk CSV export of all inspection records.
    """
    # Fetch all completed inspections from DB
    inspections = db.query(models.Inspection).filter(models.Inspection.status == "completed").all()
    if not inspections:
        raise HTTPException(status_code=404, detail="No completed inspections found to export")

    try:
        csv_content = services.generate_csv_export(inspections)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=verivision_bulk_export.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV export: {str(e)}")
