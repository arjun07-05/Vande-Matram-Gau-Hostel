from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, Float, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.session import Base

class Cow(Base):
    __tablename__ = "cows"

    id = Column(Integer, primary_key=True, index=True)
    cow_number = Column(String, unique=True, index=True, nullable=False)
    cow_name = Column(String, index=True, nullable=True)
    breed = Column(String, nullable=True)
    color = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    purchase_date = Column(Date, nullable=True)
    photo = Column(String, nullable=True) # Path to image
    qr_code = Column(String, nullable=True) # Path to QR code
    type = Column(String, nullable=True) # milk, without milk
    calf_type = Column(String, nullable=True) # વાછરડો, વાછરડી, નથી
    condition = Column(String, nullable=True) # Healthy, Pregnant, Milking, Dry, etc.
    purchase_price = Column(Float, nullable=True) # Buying price (₹)
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    status_history = relationship("CowStatusHistory", back_populates="cow", order_by="desc(CowStatusHistory.change_date), desc(CowStatusHistory.created_at)", cascade="all, delete-orphan")

class CowStatusHistory(Base):
    __tablename__ = "cow_status_history"

    id = Column(Integer, primary_key=True, index=True)
    cow_id = Column(Integer, ForeignKey("cows.id", ondelete="CASCADE"), nullable=False, index=True)
    condition = Column(String, nullable=True) # e.g. તંદુરસ્ત, ગાભણ, દૂધ આપતી, વસૂકેલી, બીમાર
    type = Column(String, nullable=True) # e.g. દૂધ આપતી, દૂધ ન આપતી
    calf_type = Column(String, nullable=True) # વાછરડો, વાછરડી, નથી
    change_date = Column(Date, nullable=False, default=func.current_date(), index=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cow = relationship("Cow", back_populates="status_history")
