from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database.session import Base

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    morning_gowal_milk = Column(Float, default=2.0)
    evening_gowal_milk = Column(Float, default=2.0)
    unit = Column(String, default="Liter") # Liter, Kg
    member_mode = Column(String, default="Automatic") # Automatic, Manual
    logo = Column(String, nullable=True) # Path to logo
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
