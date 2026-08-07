from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")  # user, admin
    created_at = Column(DateTime, default=datetime.utcnow)

    inspections = relationship("Inspection", back_populates="inspector")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    commodity = Column(String, nullable=False)  # motherboard, memory, storage
    created_at = Column(DateTime, default=datetime.utcnow)

    golden_references = relationship("GoldenReference", back_populates="product", cascade="all, delete-orphan")
    inspections = relationship("Inspection", back_populates="product")

class GoldenReference(Base):
    __tablename__ = "golden_references"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    image_path = Column(String, nullable=False)
    expected_serial = Column(String, nullable=True)
    roi_config = Column(JSON, nullable=True)  # Coordinates for text/labels/seals
    angle = Column(String, default="top")
    embedding_vector = Column(JSON, nullable=True)  # 512-dim visual vector embedding
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="golden_references")

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, default=generate_uuid, unique=True, index=True, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    captured_image_path = Column(String, nullable=False)
    capture_site = Column(String, nullable=False)
    capture_angle = Column(String, default="top")
    vendor = Column(String, nullable=True)          # e.g. "Vendor A"
    component_name = Column(String, nullable=True)  # e.g. "Brake Disc"
    date = Column(String, nullable=True)            # e.g. "2026-07-20"
    status = Column(String, default="pending")  # pending, completed, retake_needed
    created_at = Column(DateTime, default=datetime.utcnow)

    inspector = relationship("User", back_populates="inspections")
    product = relationship("Product", back_populates="inspections")
    result = relationship("InspectionResult", uselist=False, back_populates="inspection", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="inspection", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="inspection", cascade="all, delete-orphan")

class InspectionResult(Base):
    __tablename__ = "inspection_results"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    ssim_score = Column(Float, nullable=True)
    keypoint_match_rate = Column(Float, nullable=True)
    ocr_detected_text = Column(String, nullable=True)
    ocr_expected_text = Column(String, nullable=True)
    fraud_score = Column(Integer, default=0)  # 0 to 100
    verdict = Column(String, nullable=False)  # tampered, missing, mismatched, reused, clean
    category = Column(String, nullable=True)  # Anomaly Test Category
    confidence = Column(Float, nullable=False)
    recommended_action = Column(String, nullable=False)  # Accept, Quarantine & Escalate, Retake, etc.
    explanation = Column(Text, nullable=True)
    heatmap_path = Column(String, nullable=True)
    diagnostic_path = Column(String, nullable=True)
    evidence_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    inspection = relationship("Inspection", back_populates="result")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    pdf_path = Column(String, nullable=True)
    html_path = Column(String, nullable=True)
    csv_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    inspection = relationship("Inspection", back_populates="reports")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    actor = Column(String, nullable=False)  # Email/name of operator/QA
    action = Column(String, nullable=False)  # verdict_override, approval
    comments = Column(Text, nullable=True)
    previous_verdict = Column(String, nullable=True)
    new_verdict = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    inspection = relationship("Inspection", back_populates="audit_logs")
