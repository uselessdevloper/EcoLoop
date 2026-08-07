import math
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app import models, schemas


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the Earth using the Haversine formula (pure Python).
    
    :param lat1: Latitude of point 1 in degrees
    :param lon1: Longitude of point 1 in degrees
    :param lat2: Latitude of point 2 in degrees
    :param lon2: Longitude of point 2 in degrees
    :return: Distance in kilometers (rounded to 2 decimal places)
    """
    # Earth radius in kilometers
    EARTH_RADIUS_KM = 6371.0

    # Convert latitude and longitude from degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Apply Haversine formula
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = EARTH_RADIUS_KM * c

    return round(distance, 2)


def find_nearest_available_partner(
    db: Session, pickup_lat: float, pickup_lon: float
) -> Optional[Dict[str, Any]]:
    """
    Find the single nearest available partner for a given pickup location.
    
    Filters: Only partners with status == 'available' (case-insensitive).
    Sorts: By Haversine distance ascending.
    
    :return: Dict with partner_uid, distance_km, and partner OR None if no available partner.
    """
    sorted_partners = find_all_available_partners_sorted(db, pickup_lat, pickup_lon)
    if not sorted_partners:
        return None
    return sorted_partners[0]


def find_all_available_partners_sorted(
    db: Session, pickup_lat: float, pickup_lon: float
) -> List[Dict[str, Any]]:
    """
    Find all available partners and return them sorted by distance from pickup location.
    
    :return: List of dicts, each containing:
             - partner_uid (str)
             - distance_km (float)
             - partner (models.Partner ORM object)
    """
    # Query database for available partners (ignore unavailable/busy/offline)
    available_partners = (
        db.query(models.Partner)
        .filter(models.Partner.status.ilike("available"))
        .all()
    )

    results = []
    for partner in available_partners:
        dist = haversine_distance(pickup_lat, pickup_lon, partner.latitude, partner.longitude)
        results.append({
            "partner_uid": partner.uid,
            "distance_km": dist,
            "partner": partner
        })

    # Sort available partners by distance in ascending order
    results.sort(key=lambda item: item["distance_km"])
    return results
