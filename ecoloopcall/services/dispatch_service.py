"""
Dispatch Service Module
Handles automatic and manual partner dispatch logic for e-waste pickups.

Workflow:
1. Pickup Created / Selected
2. Find nearest available partner (via Haversine geo matching)
3. Assign partner to pickup
4. Update Pickup status to 'Assigned' in database
5. Call Notification Service
"""
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from app import models, schemas
from services import geo_service, partner_service, pickup_service, notification_service


def dispatch_pickup(db: Session, pickup_id: int) -> Dict[str, Any]:
    """
    Execute dispatch workflow for an existing pickup request:
    
    1. Retrieve Pickup request from DB.
    2. Find nearest available partner using Haversine geo-matching.
    3. If partner found:
       - Assign partner to pickup.
       - Update pickup status to 'Assigned'.
       - Call Notification Service interface.
    4. Return dispatch result summary.
    """
    # 1. Retrieve Pickup from DB
    pickup = pickup_service.get_pickup(db, pickup_id)
    if not pickup:
        return {
            "success": False,
            "message": f"Pickup request with ID {pickup_id} not found.",
            "distance_km": None,
            "pickup": None,
            "matched_partner": None
        }

    # Ensure seed partners exist if empty
    partner_service.seed_partners_if_empty(db)

    # 2. Find nearest available partner using Haversine formula
    match = geo_service.find_nearest_available_partner(
        db=db,
        pickup_lat=pickup.latitude,
        pickup_lon=pickup.longitude
    )

    if not match:
        return {
            "success": False,
            "message": "No available partners found near this pickup location.",
            "distance_km": None,
            "pickup": pickup,
            "matched_partner": None
        }

    matched_partner = match["partner"]
    distance_km = match["distance_km"]

    # 3 & 4. Assign partner and update Pickup in DB
    updated_pickup = pickup_service.assign_partner_to_pickup(
        db=db,
        pickup_id=pickup.id,
        partner_id=matched_partner.id
    )

    # 5. Call Notification Service interface (Triggers Twilio Studio Flow execution)
    location_str = f"({updated_pickup.latitude}, {updated_pickup.longitude})"
    notification_service.notify_partner_assigned(
        pickup_id=updated_pickup.id,
        partner_id=matched_partner.id,
        partner_name=matched_partner.name,
        consumer_name=updated_pickup.consumer_name,
        phone_number=matched_partner.phone,
        location=location_str,
        estimated_price=updated_pickup.estimated_price
    )

    return {
        "success": True,
        "message": f"Pickup #{updated_pickup.id} successfully dispatched to partner '{matched_partner.name}' ({distance_km} km away).",
        "distance_km": distance_km,
        "pickup": updated_pickup,
        "matched_partner": matched_partner
    }


def create_and_dispatch_pickup(db: Session, pickup_in: schemas.PickupCreate) -> Dict[str, Any]:
    """
    Full automated end-to-end workflow:
    1. Consumer submits -> Pickup stored in database (Status = Pending).
    2. Immediately triggers dispatch workflow to assign nearest available partner.
    """
    # Step 1: Create pickup request in DB
    new_pickup = pickup_service.create_pickup(db, pickup_in)

    # Step 2: Trigger dispatch
    return dispatch_pickup(db, new_pickup.id)
