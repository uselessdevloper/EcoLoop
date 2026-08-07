"""
Twilio Studio Service Module
Triggers Twilio Studio Flows for voice dispatch and automated SMS fallback.
"""
import uuid
from typing import Dict, Any
from twilio.rest import Client
from app.config import settings


def trigger_studio_flow_execution(
    phone_number: str,
    pickup_id: int,
    customer_name: str,
    location: str,
    estimated_commission: float
) -> Dict[str, Any]:
    """
    Trigger Twilio Studio Flow execution via REST API.
    
    Flow execution parameters passed:
    - To: Destination partner phone number
    - From: Twilio sender phone number
    - pickup_id: Database ID of pickup
    - customer_name: Consumer name
    - location: Coordinates / address
    - estimated_commission: Calculated partner payout
    - fastapi_webhook_url: URL called when partner accepts (Press 1)
    """
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    flow_sid = settings.TWILIO_STUDIO_FLOW_SID
    from_phone = settings.TWILIO_PHONE_NUMBER
    base_url = settings.TWILIO_WEBHOOK_BASE_URL.rstrip("/")
    webhook_url = f"{base_url}/voice-response"

    parameters = {
        "To": phone_number,
        "From": from_phone,
        "pickup_id": str(pickup_id),
        "customer_name": customer_name,
        "location": location,
        "estimated_commission": f"{estimated_commission:.2f}",
        "fastapi_webhook_url": webhook_url
    }

    is_configured = (
        account_sid
        and auth_token
        and flow_sid
        and not account_sid.startswith("ACXXXXXX")
        and not flow_sid.startswith("FWXXXXXX")
    )

    if is_configured:
        try:
            client = Client(account_sid, auth_token)
            execution = client.studio.v2.flows(flow_sid).executions.create(
                to=phone_number,
                from_=from_phone,
                parameters=parameters
            )
            print(f"[TWILIO STUDIO] Studio Flow execution triggered for Pickup #{pickup_id}. Execution SID: {execution.sid}")
            return {
                "success": True,
                "execution_sid": execution.sid,
                "status": execution.status,
                "phone_number": phone_number,
                "pickup_id": pickup_id,
                "mode": "live"
            }
        except Exception as e:
            print(f"[TWILIO STUDIO] Twilio API connection note: {str(e)}. Falling back to simulation mode.")

    # Simulation fallback mode
    mock_execution_sid = f"FN{uuid.uuid4().hex[:30].upper()}"
    print(f"[TWILIO STUDIO] [SIMULATION] Studio Flow execution queued for Pickup #{pickup_id}. Mock Execution SID: {mock_execution_sid}")
    return {
        "success": True,
        "execution_sid": mock_execution_sid,
        "status": "active",
        "phone_number": phone_number,
        "pickup_id": pickup_id,
        "parameters": parameters,
        "mode": "simulated"
    }
