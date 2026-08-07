import os
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.config import settings
from app import models, schemas, utils

router = APIRouter(prefix="/products", tags=["Products"])

@router.post("", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: schemas.ProductCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.require_role(["admin"]))
):
    # Verify unique part number
    db_product = db.query(models.Product).filter(models.Product.part_number == product_in.part_number).first()
    if db_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product part number already exists",
        )
    
    new_product = models.Product(**product_in.model_dump())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.get("", response_model=List[schemas.ProductResponse])
def get_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.get_current_user)
):
    return db.query(models.Product).all()

@router.post("/{product_id}/golden", response_model=schemas.GoldenReferenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_golden_reference(
    product_id: int,
    file: UploadFile = File(...),
    expected_serial: Optional[str] = Form(None),
    roi_config: Optional[str] = Form(None),  # Expecting JSON string
    angle: str = Form("top"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(utils.require_role(["admin"]))
):
    # Check if product exists
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Save uploaded file
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"golden_{product_id}_{angle}{file_ext}"
    file_path = os.path.join(settings.GOLDEN_DIR, filename)
    # Store relative path for frontend URL resolution (matches seed_db pattern)
    relative_path = f"data/golden/{filename}"

    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")

    # Parse ROI config JSON string if provided
    roi_json = None
    if roi_config:
        try:
            roi_json = json.loads(roi_config)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid ROI config JSON string")

    # Save reference record to DB
    # If a golden reference with the same angle already exists, update it, otherwise create new
    db_golden = db.query(models.GoldenReference).filter(
        models.GoldenReference.product_id == product_id,
        models.GoldenReference.angle == angle
    ).first()

    if db_golden:
        db_golden.image_path = relative_path
        db_golden.expected_serial = expected_serial
        db_golden.roi_config = roi_json
    else:
        db_golden = models.GoldenReference(
            product_id=product_id,
            image_path=relative_path,
            expected_serial=expected_serial,
            roi_config=roi_json,
            angle=angle
        )
        db.add(db_golden)

    db.commit()
    db.refresh(db_golden)
    return db_golden
