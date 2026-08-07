from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


# ==========================================
# PARTNER SCHEMAS
# ==========================================

class PartnerBase(BaseModel):
    """Base fields shared across Partner schemas."""
    name: str = Field(..., description="Full name or company name of the partner", example="EcoRecycle Logistics")
    phone: str = Field(..., description="Contact phone number", example="+1-555-019-2834")
    latitude: float = Field(..., description="Partner base latitude", example=37.7749)
    longitude: float = Field(..., description="Partner base longitude", example=-122.4194)
    status: Optional[str] = Field(default="available", description="Current operational status: available, busy, offline", example="available")
    rating: Optional[float] = Field(default=5.0, ge=0.0, le=5.0, description="Average rating out of 5.0", example=4.9)
    acceptance_rate: Optional[float] = Field(default=100.0, ge=0.0, le=100.0, description="Acceptance rate percentage", example=98.5)
    preferred_mode: Optional[str] = Field(default="bike", description="Transport mode: bike, van, truck, eco_walker", example="bike")


class PartnerCreate(PartnerBase):
    """Schema for creating a new Partner."""
    uid: Optional[str] = Field(default=None, description="Optional custom unique identifier. System autogenerates if omitted.", example="PTR-A1B2C3D4")


class PartnerUpdate(BaseModel):
    """Schema for updating an existing Partner (partial update)."""
    name: Optional[str] = None
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None
    rating: Optional[float] = None
    acceptance_rate: Optional[float] = None
    preferred_mode: Optional[str] = None


class PartnerStatusUpdateRequest(BaseModel):
    """Schema for updating partner status."""
    id: Optional[int] = Field(default=None, description="Partner ID (optional if specified in URL path)", example=1)
    status: str = Field(..., description="New partner status (e.g., available, busy, offline)", example="available")


class PartnerResponse(PartnerBase):
    """Schema for returning Partner data."""
    id: int
    uid: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# PICKUP SCHEMAS
# ==========================================

class PickupBase(BaseModel):
    """Base fields shared across Pickup schemas."""
    consumer_name: str = Field(..., description="Name of the consumer requesting pickup", example="Jane Doe")
    device: str = Field(..., description="Description of the e-waste device", example="MacBook Pro 15-inch 2018")
    latitude: float = Field(..., description="Pickup location latitude", example=37.7833)
    longitude: float = Field(..., description="Pickup location longitude", example=-122.4167)
    estimated_price: float = Field(..., ge=0.0, description="Estimated buyback / recycling value", example=150.00)
    status: Optional[str] = Field(default="pending", description="Pickup status: pending, assigned, in_transit, completed, cancelled", example="pending")
    assigned_partner: Optional[int] = Field(default=None, description="ID of the assigned partner, if any", example=1)


class PickupCreate(BaseModel):
    """Schema for submitting a new Pickup request by a consumer."""
    consumer_name: str = Field(..., description="Name of the consumer requesting pickup", example="Jane Doe")
    device: str = Field(..., description="Description of the e-waste device", example="MacBook Pro 15-inch 2018")
    latitude: float = Field(..., description="Pickup location latitude", example=37.7833)
    longitude: float = Field(..., description="Pickup location longitude", example=-122.4167)
    estimated_price: float = Field(..., ge=0.0, description="Estimated buyback / recycling value", example=150.00)
    status: Optional[str] = Field(default="Pending", description="Pickup status, defaults to Pending", example="Pending")
    assigned_partner: Optional[int] = Field(default=None, description="ID of the assigned partner, if any", example=None)


class PickupUpdate(BaseModel):
    """Schema for updating an existing Pickup request."""
    consumer_name: Optional[str] = None
    device: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    estimated_price: Optional[float] = None
    status: Optional[str] = None
    assigned_partner: Optional[int] = None


class PickupAssignRequest(BaseModel):
    """Schema for assigning a partner to a pickup request."""
    partner_id: int = Field(..., description="ID of the partner to assign to this pickup", example=1)


class PickupStatusUpdateRequest(BaseModel):
    """Schema for updating pickup status."""
    status: str = Field(..., description="New status (e.g., Pending, Assigned, In Transit, Completed, Cancelled)", example="In Transit")


class PickupResponse(PickupBase):
    """Schema for returning Pickup data."""
    id: int
    created_at: Optional[datetime] = None
    partner_details: Optional[PartnerResponse] = None

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# GEO MATCHING SCHEMAS
# ==========================================

class GeoMatchRequest(BaseModel):
    """Schema for requesting partner geo matching."""
    latitude: float = Field(..., description="Pickup location latitude", example=28.6139)
    longitude: float = Field(..., description="Pickup location longitude", example=77.2090)


class GeoMatchResult(BaseModel):
    """Schema for Geo Matching result of a partner."""
    partner_uid: str = Field(..., description="Unique ID of the matched partner", example="PTR-RAJESH-01")
    distance_km: float = Field(..., description="Haversine distance from pickup location in kilometers", example=3.42)
    partner: PartnerResponse = Field(..., description="Full details of the matched partner")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# DISPATCH SCHEMAS
# ==========================================

class DispatchResultResponse(BaseModel):
    """Schema for returning dispatch workflow result."""
    success: bool = Field(..., description="Whether dispatch was successful", example=True)
    message: str = Field(..., description="Summary message of dispatch operation", example="Pickup #1 assigned to partner Rajesh.")
    distance_km: Optional[float] = Field(None, description="Distance to matched partner in km", example=1.25)
    pickup: Optional[PickupResponse] = Field(None, description="Updated pickup details")
    matched_partner: Optional[PartnerResponse] = Field(None, description="Details of assigned partner")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# TWILIO SCHEMAS
# ==========================================

class TwilioCallRequest(BaseModel):
    """Schema for triggering a Twilio voice call manually."""
    phone_number: str = Field(..., description="Destination partner phone number", example="+919876543210")
    pickup_id: int = Field(..., description="ID of the associated pickup request", example=1)


class TwilioCallResponse(BaseModel):
    """Schema for returning Twilio voice call result."""
    success: bool = Field(..., description="Whether call was queued/initiated", example=True)
    call_sid: str = Field(..., description="Twilio Call SID or mock SID", example="CA1234567890abcdef")
    status: str = Field(..., description="Call status", example="queued")
    phone_number: str = Field(..., description="Destination phone number", example="+919876543210")
    pickup_id: int = Field(..., description="Pickup ID", example=1)
    webhook_url: str = Field(..., description="Returned TwiML webhook URL", example="http://localhost:8000/twilio/voice?pickup_id=1")
    mode: str = Field(..., description="Mode: 'live' or 'simulated'", example="simulated")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SMS SCHEMAS
# ==========================================

class SMSMessageRequest(BaseModel):
    """Schema for manually triggering a fallback SMS notification."""
    phone_number: str = Field(..., description="Destination partner phone number", example="+919876543210")
    pickup_id: int = Field(..., description="ID of the associated pickup request", example=1)
    customer_name: str = Field(..., description="Name of the customer", example="Ramesh Kumar")
    location: str = Field(..., description="Pickup location", example="Connaught Place, Delhi (28.6139, 77.2090)")
    estimated_commission: float = Field(..., ge=0.0, description="Estimated partner commission", example=15.0)


class SMSMessageResponse(BaseModel):
    """Schema for returning Twilio SMS operation result."""
    success: bool = Field(..., description="Whether SMS was queued/sent", example=True)
    message_sid: str = Field(..., description="Twilio Message SID or mock SID", example="SM1234567890abcdef")
    status: str = Field(..., description="SMS delivery status", example="sent")
    phone_number: str = Field(..., description="Destination phone number", example="+919876543210")
    pickup_id: int = Field(..., description="Pickup ID", example=1)
    body: str = Field(..., description="Sent SMS body text")
    mode: str = Field(..., description="Mode: 'live' or 'simulated'", example="simulated")

    model_config = ConfigDict(from_attributes=True)
