from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.session import Base

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, index=True, nullable=False)
    quantity = Column(Float, default=1.0, nullable=False)
    unit = Column(String, default="નંગ", nullable=False)
    price_per_unit = Column(Float, default=0.0, nullable=False)
    total_price = Column(Float, default=0.0, nullable=False)
    purchase_date = Column(Date, default=func.current_date(), nullable=False, index=True)
    supplier = Column(String, nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class MaterialUsage(Base):
    __tablename__ = "material_usages"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, index=True, nullable=False)
    quantity_used = Column(Float, default=1.0, nullable=False)
    unit = Column(String, default="નંગ", nullable=False)
    usage_date = Column(Date, default=func.current_date(), nullable=False, index=True)
    purpose = Column(String, nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class MaterialContribution(Base):
    __tablename__ = "material_contributions"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, default=0.0, nullable=False) # Contributed money (₹)
    contribution_date = Column(Date, default=func.current_date(), nullable=False, index=True)
    payment_mode = Column(String, default="Cash", nullable=True) # Cash, Online/UPI, Bank Transfer
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    member = relationship("Member")
