from fastapi import APIRouter, Depends, Query, Form, Response, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app import models, schemas
from services import twilio_service, pickup_service, notification_service, sms_service, partner_service

router = APIRouter(
    tags=["Twilio Voice & SMS"]
)


@router.api_route("/twilio/voice", methods=["GET", "POST"], summary="TwiML Webhook Endpoint for Partner Voice Calls")
@router.api_route("/voice", methods=["GET", "POST"], include_in_schema=False)
def twilio_voice_webhook(pickup_id: int = Query(..., description="ID of the pickup request")):
    """
    Twilio Webhook Endpoint.
    Returns TwiML XML instructing Twilio to read:
    "Hello. You have a new EcoLoop pickup. Press 1 to accept."
    """
    twiml_xml = twilio_service.generate_twiml_pickup_prompt(pickup_id=pickup_id)
    return Response(content=twiml_xml, media_type="application/xml")


@router.api_route("/voice-response", methods=["GET", "POST"], summary="Twilio Voice Response Callback Webhook")
@router.api_route("/twilio/voice-response", methods=["GET", "POST"], include_in_schema=False)
def voice_response_webhook(
    pickup_id: Optional[int] = Query(None, description="ID of the pickup request"),
    Pickup_ID: Optional[int] = Query(None, alias="Pickup ID", description="ID of the pickup request"),
    pickup_id_form: Optional[int] = Form(None, alias="pickup_id"),
    Digits: Optional[str] = Form(None, description="Digit key pressed by user"),
    digits_query: Optional[str] = Query(None, alias="Digits"),
    db: Session = Depends(get_db)
):
    """
    POST /voice-response

    Receives:
    - Digits (1 to accept, any other key to reject)
    - Pickup ID (pickup_id)

    Logic:
    - If Digits == 1 or empty: Updates pickup status in database to 'Accepted'.
    - Else: Updates pickup status in database to 'Rejected' AND automatically triggers Twilio SMS fallback.
    """
    target_pickup_id = pickup_id or Pickup_ID or pickup_id_form

    pressed_digit = Digits if Digits is not None else digits_query
    str_digit = str(pressed_digit).strip() if pressed_digit is not None else ""

    print(f"[TWILIO VOICE WEBHOOK] Received voice response. pickup_id: {target_pickup_id}, Digits: '{str_digit}'")

    # Evaluate Digits == 1 condition
    if str_digit == "1" or str_digit == "":
        new_status = "Accepted"
    else:
        new_status = "Rejected"

    # Update target pickup or most recent active pickup
    if target_pickup_id is not None:
        db_pickup = pickup_service.update_pickup_status(db=db, pickup_id=target_pickup_id, new_status=new_status)
    else:
        pickups = db.query(models.Pickup).order_by(models.Pickup.id.desc()).all()
        db_pickup = None
        for p in pickups:
            if (p.status or "").lower() not in ["completed", "cancelled"]:
                db_pickup = pickup_service.update_pickup_status(db=db, pickup_id=p.id, new_status=new_status)
                break

    # Automatic SMS Fallback if call was Rejected
    if new_status == "Rejected" and db_pickup:
        phone_to_notify = "+919142041131"
        if db_pickup.assigned_partner:
            partner = partner_service.get_partner(db, db_pickup.assigned_partner)
            if partner:
                phone_to_notify = partner.phone

        location_str = f"({db_pickup.latitude}, {db_pickup.longitude})"
        notification_service.trigger_sms_fallback(
            phone_number=phone_to_notify,
            pickup_id=db_pickup.id,
            customer_name=db_pickup.consumer_name,
            location=location_str,
            estimated_price=db_pickup.estimated_price,
            reason="Rejected by partner via key press"
        )

    twiml_xml = twilio_service.generate_twiml_key_response(digits=str_digit, pickup_id=target_pickup_id or (db_pickup.id if db_pickup else 1))
    return Response(content=twiml_xml, media_type="application/xml")


@router.api_route("/sms-reply", methods=["GET", "POST"], summary="Twilio Incoming SMS Reply Webhook")
@router.api_route("/twilio/sms-reply", methods=["GET", "POST"], include_in_schema=False)
@router.api_route("/sms", methods=["GET", "POST"], include_in_schema=False)
@router.api_route("/twilio/sms", methods=["GET", "POST"], include_in_schema=False)
def sms_reply_webhook(
    From: Optional[str] = Form(None),
    Body: Optional[str] = Form(None),
    from_query: Optional[str] = Query(None, alias="From"),
    body_query: Optional[str] = Query(None, alias="Body"),
    pickup_id: Optional[int] = Query(None, description="ID of pickup request"),
    db: Session = Depends(get_db)
):
    """
    Receives incoming SMS reply from partner phone (e.g. 'ACCEPT', '1', 'YES', 'OK').
    Matches partner phone number or updates most recent active pickup to 'Accepted'.
    Returns TwiML SMS confirmation.
    """
    from twilio.twiml.messaging_response import MessagingResponse

    response = MessagingResponse()
    raw_body = Body if Body is not None else body_query
    body_str = (raw_body or "").strip().upper()

    raw_from = From if From is not None else from_query
    from_str = (raw_from or "").strip()

    print(f"[TWILIO SMS WEBHOOK] Received SMS. From: '{from_str}', Body: '{body_str}', pickup_id: {pickup_id}")

    is_accept = any(keyword in body_str for keyword in ["ACCEPT", "1", "YES", "OK", "CONFIRM", "AGREE"])

    if is_accept:
        target_pickups = []

        if pickup_id:
            db_pickup = pickup_service.get_pickup(db, pickup_id)
            if db_pickup:
                target_pickups.append(db_pickup)
        else:
            # 1. Match partner by phone number if From is present
            if from_str:
                clean_phone = from_str.replace(" ", "").replace("-", "")
                partners = partner_service.get_partners(db, limit=100)
                matching_partner = None
                for p in partners:
                    p_phone_clean = (p.phone or "").replace(" ", "").replace("-", "")
                    if clean_phone and (clean_phone == p_phone_clean or clean_phone.endswith(p_phone_clean[-10:])):
                        matching_partner = p
                        break
                
                if matching_partner:
                    partner_pickups = db.query(models.Pickup).filter(
                        models.Pickup.assigned_partner == matching_partner.id
                    ).order_by(models.Pickup.id.desc()).all()

                    for p in partner_pickups:
                        if (p.status or "").lower() not in ["completed", "cancelled"]:
                            target_pickups.append(p)

            # 2. Fallback: Update most recent active non-completed pickup
            if not target_pickups:
                all_pickups = db.query(models.Pickup).order_by(models.Pickup.id.desc()).all()
                for p in all_pickups:
                    if (p.status or "").lower() not in ["completed", "cancelled"]:
                        target_pickups.append(p)
                        break

        updated_count = 0
        for p in target_pickups:
            pickup_service.update_pickup_status(db=db, pickup_id=p.id, new_status="Accepted")
            updated_count += 1
            print(f"[TWILIO SMS WEBHOOK] Successfully updated Pickup #{p.id} status to 'Accepted'")

        response.message("[EcoLoop] Pickup confirmed! Thank you for accepting.")
    else:
        response.message("[EcoLoop] Reply ACCEPT to confirm your assigned pickup.")

    return Response(content=str(response), media_type="application/xml")


@router.post("/twilio/status-callback", summary="Twilio Call Status Webhook Callback")
def twilio_status_callback(
    pickup_id: int = Query(..., description="ID of the pickup request"),
    CallStatus: Optional[str] = Form(None),
    To: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    status_lower = (CallStatus or "").lower()
    if status_lower in ["busy", "no-answer", "failed", "canceled"]:
        db_pickup = pickup_service.get_pickup(db, pickup_id)
        if db_pickup:
            phone_to_notify = To or "+919142041131"
            location_str = f"({db_pickup.latitude}, {db_pickup.longitude})"
            notification_service.trigger_sms_fallback(
                phone_number=phone_to_notify,
                pickup_id=db_pickup.id,
                customer_name=db_pickup.consumer_name,
                location=location_str,
                estimated_price=db_pickup.estimated_price,
                reason=f"Call Status: {CallStatus}"
            )
    return {"status": "processed", "call_status": CallStatus}


@router.post("/twilio/handle-key", summary="TwiML Key Press Callback Webhook (Legacy Alias)", include_in_schema=False)
def twilio_handle_key_webhook(
    pickup_id: int = Query(..., description="ID of the pickup request"),
    Digits: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    return voice_response_webhook(pickup_id=pickup_id, Digits=Digits, db=db)


@router.post("/twilio/call", response_model=schemas.TwilioCallResponse, summary="Initiate Twilio Voice Call Manually")
def make_call(request: schemas.TwilioCallRequest):
    return twilio_service.make_voice_call(
        phone_number=request.phone_number,
        pickup_id=request.pickup_id
    )


@router.post("/twilio/sms", response_model=schemas.SMSMessageResponse, summary="Send Twilio Fallback SMS Manually")
def send_sms_manual(request: schemas.SMSMessageRequest):
    return sms_service.send_pickup_sms(
        phone_number=request.phone_number,
        pickup_id=request.pickup_id,
        customer_name=request.customer_name,
        location=request.location,
        estimated_commission=request.estimated_commission
    )


@router.post("/twilio/studio/trigger", summary="Trigger Twilio Studio Flow Dispatch")
def trigger_studio_dispatch(request: schemas.SMSMessageRequest):
    from services import twilio_studio_service
    return twilio_studio_service.trigger_studio_flow_execution(
        phone_number=request.phone_number,
        pickup_id=request.pickup_id,
        customer_name=request.customer_name,
        location=request.location,
        estimated_commission=request.estimated_commission
    )
