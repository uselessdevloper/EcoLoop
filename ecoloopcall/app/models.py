import uuid
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Partner(Base):
    """
    Partner Database Model
    Represents recycling/pickup partners in the EcoLoop network.
    """
    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    uid = Column(String, unique=True, index=True, default=lambda: f"PTR-{uuid.uuid4().hex[:8].upper()}")
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, default="available", nullable=False)  # available, busy, offline
    rating = Column(Float, default=5.0, nullable=False)
    acceptance_rate = Column(Float, default=100.0, nullable=False)
    preferred_mode = Column(String, default="bike", nullable=False)  # bike, van, truck, eco_walker
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to Pickups assigned to this partner
    pickups = relationship("Pickup", back_populates="partner_details", cascade="all, delete-orphan")


class Pickup(Base):
    """
    Pickup Request Database Model
    Represents consumer e-waste pickup requests.
    """
    __tablename__ = "pickups"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    consumer_name = Column(String, nullable=False)
    device = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    estimated_price = Column(Float, nullable=False)
    status = Column(String, default="pending", nullable=False)  # pending, assigned, in_transit, completed, cancelled
    assigned_partner = Column(Integer, ForeignKey("partners.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to assigned Partner
    partner_details = relationship("Partner", back_populates="pickups")
