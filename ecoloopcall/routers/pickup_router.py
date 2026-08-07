from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import schemas
from services import pickup_service, partner_service, geo_service, dispatch_service

router = APIRouter(
    prefix="/pickup",
    tags=["Pickups & Dispatch"]
)


@router.post("", response_model=schemas.PickupResponse, status_code=status.HTTP_201_CREATED, summary="Submit a new Pickup request")
@router.post("/", response_model=schemas.PickupResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_pickup(pickup: schemas.PickupCreate, db: Session = Depends(get_db)):
    """
    Consumer submits a new e-waste pickup request.
    
    Workflow:
    1. Consumer submits details (name, device, location, estimated price).
    2. Request stored in SQLite database.
    3. Status set to 'Pending'.
    4. Returns created Pickup object including Pickup ID.
    """
    if pickup.assigned_partner:
        partner = partner_service.get_partner(db, pickup.assigned_partner)
        if not partner:
            raise HTTPException(status_code=400, detail=f"Partner with ID {pickup.assigned_partner} does not exist.")

    return pickup_service.create_pickup(db=db, pickup=pickup)


@router.post("/create-and-dispatch", response_model=schemas.DispatchResultResponse, status_code=status.HTTP_201_CREATED, summary="Submit Pickup & Auto-Dispatch Nearest Partner")
def create_and_dispatch_pickup(pickup: schemas.PickupCreate, db: Session = Depends(get_db)):
    """
    Automated Workflow:
    1. Consumer submits pickup.
    2. Pickup stored in database with status 'Pending'.
    3. Auto-finds nearest available partner via Haversine.
    4. Auto-assigns partner & sets status to 'Assigned'.
    5. Calls Notification Service interface.
    """
    result = dispatch_service.create_and_dispatch_pickup(db=db, pickup_in=pickup)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.post("/{id}/dispatch", response_model=schemas.DispatchResultResponse, summary="Dispatch Nearest Available Partner to Pickup")
def dispatch_partner_to_pickup(id: int, db: Session = Depends(get_db)):
    """
    Dispatch Workflow for existing pickup request:
    1. Finds nearest available partner via Haversine distance.
    2. Assigns partner & updates status to 'Assigned'.
    3. Updates Pickup in database.
    4. Calls Notification Service interface.
    """
    result = dispatch_service.dispatch_pickup(db=db, pickup_id=id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@router.get("/{id}", response_model=schemas.PickupResponse, summary="Get Pickup request by ID")
def read_pickup(id: int, db: Session = Depends(get_db)):
    """Retrieve details for a specific pickup request by ID."""
    db_pickup = pickup_service.get_pickup(db=db, pickup_id=id)
    if not db_pickup:
        raise HTTPException(status_code=404, detail=f"Pickup with ID {id} not found.")
    return db_pickup


@router.get("/{id}/nearest-partner", response_model=schemas.GeoMatchResult, summary="Find Nearest Available Partner for a Pickup")
def get_nearest_partner_for_pickup(id: int, db: Session = Depends(get_db)):
    """
    Find nearest available partner for an existing pickup request by ID using Haversine distance.
    """
    db_pickup = pickup_service.get_pickup(db=db, pickup_id=id)
    if not db_pickup:
        raise HTTPException(status_code=404, detail=f"Pickup with ID {id} not found.")

    partner_service.seed_partners_if_empty(db)
    match = geo_service.find_nearest_available_partner(db=db, pickup_lat=db_pickup.latitude, pickup_lon=db_pickup.longitude)
    if not match:
        raise HTTPException(status_code=404, detail="No available partners found near pickup location.")
    return match


@router.post("/{id}/assign", response_model=schemas.PickupResponse, summary="Assign a Partner to a Pickup")
def assign_partner(
    id: int, 
    payload: Optional[schemas.PickupAssignRequest] = None,
    partner_id: Optional[int] = Query(None, description="ID of partner to assign (optional query param fallback)"),
    db: Session = Depends(get_db)
):
    """
    Assign a partner to an existing pickup request.
    
    Accepts partner_id in JSON body or as a query parameter.
    Updates status to 'Assigned'.
    """
    target_partner_id = payload.partner_id if payload else partner_id
    if not target_partner_id:
        raise HTTPException(status_code=400, detail="Must provide partner_id in JSON body or query param.")

    # Verify partner exists
    partner = partner_service.get_partner(db, target_partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail=f"Partner with ID {target_partner_id} not found.")

    # Assign partner
    assigned_pickup = pickup_service.assign_partner_to_pickup(db=db, pickup_id=id, partner_id=target_partner_id)
    if not assigned_pickup:
        raise HTTPException(status_code=404, detail=f"Pickup with ID {id} not found.")
        
    return assigned_pickup


@router.post("/{id}/status", response_model=schemas.PickupResponse, summary="Update Pickup Status")
def update_status(id: int, status_update: schemas.PickupStatusUpdateRequest, db: Session = Depends(get_db)):
    """
    Update the status of a pickup request (e.g., Pending -> Assigned -> In Transit -> Completed -> Cancelled).
    """
    updated_pickup = pickup_service.update_pickup_status(db=db, pickup_id=id, new_status=status_update.status)
    if not updated_pickup:
        raise HTTPException(status_code=404, detail=f"Pickup with ID {id} not found.")
    return updated_pickup


@router.get("", response_model=List[schemas.PickupResponse], summary="List all Pickup requests")
@router.get("/", response_model=List[schemas.PickupResponse], include_in_schema=False)
def list_pickups(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    pickup_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    db: Session = Depends(get_db)
):
    """List all pickup requests with optional status filtering."""
    return pickup_service.get_pickups(db=db, skip=skip, limit=limit, status=pickup_status)
