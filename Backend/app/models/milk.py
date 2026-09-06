from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.session import Base

class MilkEntry(Base):
    __tablename__ = "milk_entries"
    __table_args__ = (
        UniqueConstraint("cow_id", "date", "shift", name="uix_milk_entries_cow_date_shift"),
    )

    id = Column(Integer, primary_key=True, index=True)
    cow_id = Column(Integer, ForeignKey("cows.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    shift = Column(String, nullable=False) # Morning, Evening
    milk_qty = Column(Float, nullable=False)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    cow = relationship("Cow")
    creator = relationship("User")
