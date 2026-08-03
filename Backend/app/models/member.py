from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Date, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.session import Base

class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    mobile = Column(String, unique=True, index=True, nullable=False)
    address = Column(Text, nullable=True)
    family_members = Column(Integer, default=1)
    milk_preference = Column(String, default="Both") # Morning, Evening, Both
    active = Column(Boolean, default=True)
    photo = Column(String, nullable=True)
    member_number = Column(Integer, unique=True, index=True, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DailyDistribution(Base):
    __tablename__ = "daily_distribution"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    shift = Column(String, nullable=False) # Morning, Evening
    milk_qty = Column(Float, nullable=False)
    received = Column(Boolean, default=False)
    received_time = Column(DateTime(timezone=True), nullable=True)
    received_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    member = relationship("Member", foreign_keys=[member_id])
    assigned_to = relationship("Member", foreign_keys=[assigned_to_id])
    receiver = relationship("User")
