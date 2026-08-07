from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import schemas
from services import partner_service, geo_service

router = APIRouter(
    prefix="/partner",
    tags=["Partners & Geo Matching"]
)


@router.post("", response_model=schemas.PartnerResponse, status_code=status.HTTP_201_CREATED, summary="Create a new Partner")
@router.post("/", response_model=schemas.PartnerResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_partner(partner: schemas.PartnerCreate, db: Session = Depends(get_db)):
    """
    Register a new partner in the EcoLoop system.
    """
    if partner.uid:
        existing_partner = partner_service.get_partner_by_uid(db, partner.uid)
        if existing_partner:
            raise HTTPException(status_code=400, detail=f"Partner with UID '{partner.uid}' already exists.")
    return partner_service.create_partner(db=db, partner=partner)


@router.get("", response_model=List[schemas.PartnerResponse], summary="Get all Partners")
@router.get("/", response_model=List[schemas.PartnerResponse], include_in_schema=False)
def read_partners(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: Session = Depends(get_db)
):
    """
    Retrieve list of all partners.
    Automatically seeds initial partners (Rajesh, Amit, Suresh) if database is empty.
    """
    partners = partner_service.get_partners(db=db, skip=skip, limit=limit)
    if not partners and skip == 0:
        partners = partner_service.seed_partners_if_empty(db)
    return partners


@router.get("/match", response_model=schemas.GeoMatchResult, summary="Find Nearest Available Partner (GET)")
@router.post("/match", response_model=schemas.GeoMatchResult, summary="Find Nearest Available Partner (POST)")
def match_nearest_partner(
    latitude: Optional[float] = Query(None, description="Pickup latitude"),
    longitude: Optional[float] = Query(None, description="Pickup longitude"),
    payload: Optional[schemas.GeoMatchRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Find nearest available partner for a pickup location using the Haversine formula.
    Ignores unavailable/busy/offline partners and sorts available partners by distance.
    """
    lat = payload.latitude if payload else latitude
    lon = payload.longitude if payload else longitude

    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="Must provide 'latitude' and 'longitude' in request.")

    # Ensure seed data exists if table is empty
    partner_service.seed_partners_if_empty(db)

    match = geo_service.find_nearest_available_partner(db=db, pickup_lat=lat, pickup_lon=lon)
    if not match:
        raise HTTPException(status_code=444 if hasattr(status, 'HTTP_444') else 404, detail="No available partners found near this location.")
    
    return match


@router.get("/match-all", response_model=List[schemas.GeoMatchResult], summary="Find All Available Partners Sorted by Distance")
def match_all_available_partners(
    latitude: float = Query(..., description="Pickup latitude"),
    longitude: float = Query(..., description="Pickup longitude"),
    db: Session = Depends(get_db)
):
    """
    Find all available partners sorted by distance from the pickup location using Haversine.
    """
    partner_service.seed_partners_if_empty(db)
    return geo_service.find_all_available_partners_sorted(db=db, pickup_lat=latitude, pickup_lon=longitude)


@router.get("/{id}", response_model=schemas.PartnerResponse, summary="Get Partner by ID")
def read_partner(id: int, db: Session = Depends(get_db)):
    """
    Retrieve details for a specific partner by ID.
    """
    db_partner = partner_service.get_partner(db=db, partner_id=id)
    if not db_partner:
        raise HTTPException(status_code=404, detail=f"Partner with ID {id} not found.")
    return db_partner


@router.patch("/status", response_model=schemas.PartnerResponse, summary="Update Partner status via body")
def update_partner_status_body(
    status_update: schemas.PartnerStatusUpdateRequest,
    partner_id: Optional[int] = Query(None, description="Partner ID as optional query parameter"),
    db: Session = Depends(get_db)
):
    """
    Update partner status. Accepts partner ID in JSON body (`id`) or query param (`partner_id`).
    """
    target_id = status_update.id or partner_id
    if not target_id:
        raise HTTPException(status_code=400, detail="Must provide partner 'id' in JSON body or query param.")

    updated_partner = partner_service.update_partner_status(db=db, partner_id=target_id, status=status_update.status)
    if not updated_partner:
        raise HTTPException(status_code=404, detail=f"Partner with ID {target_id} not found.")
    return updated_partner


@router.patch("/{id}/status", response_model=schemas.PartnerResponse, summary="Update Partner status via path parameter")
def update_partner_status_path(id: int, status_update: schemas.PartnerStatusUpdateRequest, db: Session = Depends(get_db)):
    """
    Update partner status using ID in the URL path.
    """
    updated_partner = partner_service.update_partner_status(db=db, partner_id=id, status=status_update.status)
    if not updated_partner:
        raise HTTPException(status_code=404, detail=f"Partner with ID {id} not found.")
    return updated_partner


@router.post("/seed", response_model=List[schemas.PartnerResponse], summary="Seed Database with initial Partners")
def seed_partners(db: Session = Depends(get_db)):
    """
    Manually seed the database with Rajesh, Amit, and Suresh.
    """
    return partner_service.seed_partners_if_empty(db)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a Partner")
def delete_partner(id: int, db: Session = Depends(get_db)):
    """
    Delete a partner entry from the database.
    """
    success = partner_service.delete_partner(db=db, partner_id=id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Partner with ID {id} not found.")
    return None
