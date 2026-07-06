from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True) # e.g. scan_001.pdf
    form_type = Column(String, index=True) # e.g. "10th Examination"
    academic_year = Column(String, default="2026-2027")
    form_class = Column(String, index=True) # 9th, 10th, 11th, 12th, or unknown
    
    # Specific fields extracted from OCR
    student_name = Column(String, index=True)
    father_name = Column(String, index=True)
    mother_name = Column(String)
    dob = Column(String)
    village = Column(String, index=True)
    mobile = Column(String, index=True)
    admission_no = Column(String, index=True)

    status = Column(String, default="Pending") # Received, Scanned, OCR Done, Verified, Ready, Online Entry Started, Submitted, Completed
    verification_status = Column(String, default="Pending")
    submission_status = Column(String, default="Not Submitted")
    notes = Column(Text)
    
    # Portal Status
    portal_status = Column(String, default="Not Filled") # Not Filled, Filled, Issue
    portal_issue_description = Column(Text, nullable=True)
    application_number = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Paths to media extracted or stored locally
    scan_image_path = Column(String) # Path to the full form image (front)
    scan_image_back_path = Column(String) # Path to the full form image (back)
    photo_path = Column(String) # Path to the cropped photo
    signature_path = Column(String) # Path to the cropped signature
    
    # The OCR'd data (JSON) - Detailed dump
    extracted_data = Column(JSON, default=dict)

    # Relationships
    timeline = relationship("TimelineEvent", back_populates="form", cascade="all, delete-orphan")

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"))
    action = Column(String) # e.g., "Scanned", "OCR Completed", "Verified by Office"
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = Column(String, default="System")

    form = relationship("Form", back_populates="timeline")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String) # Admin, Staff

class LearnedCropZone(Base):
    __tablename__ = "learned_crop_zones"

    id = Column(Integer, primary_key=True, index=True)
    form_class = Column(String, unique=True, index=True)
    
    # Store pixel coordinates relative to the full 300dpi image
    photo_x = Column(Integer, nullable=True)
    photo_y = Column(Integer, nullable=True)
    photo_width = Column(Integer, nullable=True)
    photo_height = Column(Integer, nullable=True)
    
    sig_x = Column(Integer, nullable=True)
    sig_y = Column(Integer, nullable=True)
    sig_width = Column(Integer, nullable=True)
    sig_height = Column(Integer, nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
