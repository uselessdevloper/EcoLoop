from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas


# Seed Partner Data Definition
SEED_PARTNERS = [
    {
        "uid": "PTR-RAJESH-01",
        "name": "Rajesh",
        "phone": "+91-9142041131",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "status": "available",
        "rating": 4.9,
        "acceptance_rate": 98.0,
        "preferred_mode": "bike",
    },
    {
        "uid": "PTR-AMIT-02",
        "name": "Amit",
        "phone": "+91-9876543211",
        "latitude": 28.5355,
        "longitude": 77.3910,
        "status": "available",
        "rating": 4.8,
        "acceptance_rate": 95.0,
        "preferred_mode": "van",
    },
    {
        "uid": "PTR-SURESH-03",
        "name": "Suresh",
        "phone": "+91-9876543212",
        "latitude": 28.4595,
        "longitude": 77.0266,
        "status": "busy",
        "rating": 4.7,
        "acceptance_rate": 92.0,
        "preferred_mode": "truck",
    },
]


def seed_partners_if_empty(db: Session) -> List[models.Partner]:
    """
    Seed initial partners (Rajesh, Amit, Suresh) if partners table is empty.
    Returns the list of seeded/existing partners.
    """
    existing_count = db.query(models.Partner).count()
    if existing_count > 0:
        return db.query(models.Partner).all()

    seeded = []
    for partner_data in SEED_PARTNERS:
        db_partner = models.Partner(**partner_data)
        db.add(db_partner)
        seeded.append(db_partner)

    db.commit()
    for p in seeded:
        db.refresh(p)
    return seeded


def get_partner(db: Session, partner_id: int) -> Optional[models.Partner]:
    """Retrieve a single partner by ID."""
    return db.query(models.Partner).filter(models.Partner.id == partner_id).first()


def get_partner_by_uid(db: Session, uid: str) -> Optional[models.Partner]:
    """Retrieve a single partner by UID."""
    return db.query(models.Partner).filter(models.Partner.uid == uid).first()


def get_partners(db: Session, skip: int = 0, limit: int = 100) -> List[models.Partner]:
    """Retrieve a list of partners with pagination."""
    return db.query(models.Partner).offset(skip).limit(limit).all()


def create_partner(db: Session, partner: schemas.PartnerCreate) -> models.Partner:
    """Create a new partner entry in the database."""
    partner_data = partner.model_dump(exclude_unset=True)
    db_partner = models.Partner(**partner_data)
    db.add(db_partner)
    db.commit()
    db.refresh(db_partner)
    return db_partner


def update_partner(db: Session, partner_id: int, partner_update: schemas.PartnerUpdate) -> Optional[models.Partner]:
    """Update an existing partner by ID."""
    db_partner = get_partner(db, partner_id)
    if not db_partner:
        return None

    update_data = partner_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_partner, key, value)

    db.commit()
    db.refresh(db_partner)
    return db_partner


def update_partner_status(db: Session, partner_id: int, status: str) -> Optional[models.Partner]:
    """Update only the operational status of a partner."""
    db_partner = get_partner(db, partner_id)
    if not db_partner:
        return None

    db_partner.status = status
    db.commit()
    db.refresh(db_partner)
    return db_partner


def delete_partner(db: Session, partner_id: int) -> bool:
    """Delete a partner by ID."""
    db_partner = get_partner(db, partner_id)
    if not db_partner:
        return False
    db.delete(db_partner)
    db.commit()
    return True



