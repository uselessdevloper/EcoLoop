from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas


def get_pickup(db: Session, pickup_id: int) -> Optional[models.Pickup]:
    """Retrieve a single pickup request by ID."""
    return db.query(models.Pickup).filter(models.Pickup.id == pickup_id).first()


def get_pickups(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None) -> List[models.Pickup]:
    """Retrieve a list of pickup requests with optional status filtering."""
    query = db.query(models.Pickup)
    if status:
        query = query.filter(models.Pickup.status == status)
    return query.offset(skip).limit(limit).all()


def create_pickup(db: Session, pickup: schemas.PickupCreate) -> models.Pickup:
    """
    Create a new pickup request in the database.
    Workflow: Consumer submits -> Pickup stored in DB -> Status = Pending -> Returns Pickup.
    """
    pickup_data = pickup.model_dump(exclude_unset=True)
    if "status" not in pickup_data or not pickup_data["status"]:
        pickup_data["status"] = "Pending"

    db_pickup = models.Pickup(**pickup_data)
    db.add(db_pickup)
    db.commit()
    db.refresh(db_pickup)
    return db_pickup


def update_pickup(db: Session, pickup_id: int, pickup_update: schemas.PickupUpdate) -> Optional[models.Pickup]:
    """Update an existing pickup request by ID."""
    db_pickup = get_pickup(db, pickup_id)
    if not db_pickup:
        return None

    update_data = pickup_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_pickup, key, value)

    db.commit()
    db.refresh(db_pickup)
    return db_pickup


def assign_partner_to_pickup(db: Session, pickup_id: int, partner_id: int) -> Optional[models.Pickup]:
    """Assign a partner to a pickup request and update status to Assigned."""
    db_pickup = get_pickup(db, pickup_id)
    if not db_pickup:
        return None

    db_pickup.assigned_partner = partner_id
    db_pickup.status = "Assigned"
    db.commit()
    db.refresh(db_pickup)
    return db_pickup


def update_pickup_status(db: Session, pickup_id: int, new_status: str) -> Optional[models.Pickup]:
    """Update the status of a pickup request."""
    db_pickup = get_pickup(db, pickup_id)
    if not db_pickup:
        return None

    db_pickup.status = new_status
    db.commit()
    db.refresh(db_pickup)
    return db_pickup


def delete_pickup(db: Session, pickup_id: int) -> bool:
    """Delete a pickup request by ID."""
    db_pickup = get_pickup(db, pickup_id)
    if not db_pickup:
        return False
    db.delete(db_pickup)
    db.commit()
    return True
