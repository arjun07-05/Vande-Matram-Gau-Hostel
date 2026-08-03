from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text
from sqlalchemy.sql import func
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
    remarks = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
