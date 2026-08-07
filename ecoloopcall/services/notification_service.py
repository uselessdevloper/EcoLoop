"""
Notification Service Module
Handles notification dispatch interface for EcoLoop assignment events and triggers Twilio Voice calls and SMS fallbacks.
"""
from typing import Dict, Any, Optional
from services import twilio_service, twilio_studio_service, sms_service


def notify_partner_assigned(
    pickup_id: int,
    partner_id: int,
    partner_name: str,
    consumer_name: str,
    phone_number: Optional[str] = None,
    location: str = "Delhi NCR",
    estimated_price: float = 250.0
) -> Dict[str, Any]:
    """
    Modular notification handler.
    Called when a partner is assigned to a pickup request.
    Triggers automated Twilio Studio Flow execution for live voice call & SMS fallback.
    """
    print(
        f"[NOTIFICATION SERVICE] Dispatch Notification Sent! "
        f"Pickup #{pickup_id} assigned to Partner '{partner_name}' (ID: {partner_id}) "
        f"for Consumer '{consumer_name}'."
    )
    
    target_phone = phone_number or "+919142041131"
    estimated_commission = round(estimated_price * 0.10, 2)

    call_result = twilio_studio_service.trigger_studio_flow_execution(
        phone_number=target_phone,
        pickup_id=pickup_id,
        customer_name=consumer_name,
        location=location,
        estimated_commission=estimated_commission
    )
    return call_result


def trigger_sms_fallback(
    phone_number: str,
    pickup_id: int,
    customer_name: str,
    location: str,
    estimated_price: float,
    reason: str = "Voice Call Unanswered/Rejected/Failed"
) -> Dict[str, Any]:
    """
    Automated fallback SMS trigger when Voice Call fails, is busy, rejected, or unanswered.
    Calculates estimated partner commission (10% of device estimated price).
    """
    print(f"[NOTIFICATION SERVICE] Voice Call condition: {reason}. Triggering automated Twilio SMS fallback...")
    
    # Calculate estimated commission (10% of estimated buyback price)
    estimated_commission = round(estimated_price * 0.10, 2)

    sms_result = sms_service.send_pickup_sms(
        phone_number=phone_number,
        pickup_id=pickup_id,
        customer_name=customer_name,
        location=location,
        estimated_commission=estimated_commission
    )
    return sms_result
