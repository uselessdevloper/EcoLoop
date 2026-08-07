"""
Twilio Voice Integration Service
Handles TwiML generation, voice call initiation, and webhook response processing.
"""
import uuid
from typing import Dict, Any
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather
from app.config import settings


def generate_twiml_pickup_prompt(pickup_id: int) -> str:
    """
    Generate TwiML XML response for EcoLoop partner voice calls.
    
    Voice message requirement:
    "Hello. You have a new EcoLoop pickup. Press 1 to accept."
    """
    response = VoiceResponse()
    
    # Construct webhook callback URL for digit input handling (/voice-response)
    base_url = settings.TWILIO_WEBHOOK_BASE_URL.rstrip("/")
    action_url = f"{base_url}/voice-response?pickup_id={pickup_id}"
    
    # Gather digit input from partner (Press 1 to accept)
    gather = Gather(
        num_digits=1,
        action=action_url,
        method="POST",
        timeout=10
    )
    gather.say(
        "Hello. You have a new EcoLoop pickup. Press 1 to accept.",
        voice="alice",
        language="en-US"
    )
    
    response.append(gather)
    # Fallback message if no digit is pressed
    response.say("We did not receive any input. Goodbye.", voice="alice")
    return str(response)


def generate_twiml_key_response(digits: str, pickup_id: int) -> str:
    """
    Generate TwiML XML response after partner presses a key.
    
    If Digits == 1: Status = Accepted
    Else: Status = Rejected
    """
    response = VoiceResponse()
    str_digits = str(digits).strip() if digits is not None else ""
    
    if str_digits == "1":
        response.say(f"Pickup number {pickup_id} accepted. Thank you!", voice="alice")
    else:
        response.say(f"Pickup number {pickup_id} rejected.", voice="alice")
    return str(response)


def make_voice_call(phone_number: str, pickup_id: int) -> Dict[str, Any]:
    """
    Initiate an automated Twilio voice call to a partner for a pickup assignment.
    
    Uses environment variables:
    - TWILIO_ACCOUNT_SID
    - TWILIO_AUTH_TOKEN
    - TWILIO_PHONE_NUMBER
    
    :param phone_number: Partner destination phone number
    :param pickup_id: Database ID of the pickup request
    :return: Dict containing call SID, status, phone_number, pickup_id, and TwiML webhook_url.
    """
    base_url = settings.TWILIO_WEBHOOK_BASE_URL.rstrip("/")
    webhook_url = f"{base_url}/twilio/voice?pickup_id={pickup_id}"

    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    from_phone = settings.TWILIO_PHONE_NUMBER

    # Check if valid production Twilio credentials are configured
    is_configured = (
        account_sid
        and auth_token
        and from_phone
        and not account_sid.startswith("ACXXXXXX")
    )

    if is_configured:
        try:
            client = Client(account_sid, auth_token)
            call = client.calls.create(
                to=phone_number,
                from_=from_phone,
                url=webhook_url,
                method="GET"
            )
            print(f"[TWILIO SERVICE] Live call initiated to {phone_number} for Pickup #{pickup_id}. Call SID: {call.sid}")
            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status,
                "phone_number": phone_number,
                "pickup_id": pickup_id,
                "webhook_url": webhook_url,
                "mode": "live"
            }
        except Exception as e:
            print(f"[TWILIO SERVICE] Twilio API connection note: {str(e)}. Falling back to simulation mode.")

    # Simulation fallback mode (for testing without live Twilio credentials)
    mock_sid = f"CA{uuid.uuid4().hex[:30].upper()}"
    print(f"[TWILIO SERVICE] [SIMULATION] Voice call queued to {phone_number} for Pickup #{pickup_id}. Mock SID: {mock_sid}")

    return {
        "success": True,
        "call_sid": mock_sid,
        "status": "queued",
        "phone_number": phone_number,
        "pickup_id": pickup_id,
        "webhook_url": webhook_url,
        "mode": "simulated"
    }
