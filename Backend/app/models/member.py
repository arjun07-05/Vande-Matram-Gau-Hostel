from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Date, Text, Table, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.session import Base

# Association table for Members and Multiple Assigned Cows
member_cows = Table(
    "member_cows",
    Base.metadata,
    Column("member_id", Integer, ForeignKey("members.id", ondelete="CASCADE"), primary_key=True),
    Column("cow_id", Integer, ForeignKey("cows.id", ondelete="CASCADE"), primary_key=True),
)

class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    name2 = Column(String, index=True, nullable=True)
    mobile = Column(String, unique=True, index=True, nullable=False)
    address = Column(Text, nullable=True)
    family_members = Column(Integer, default=1)
    milk_preference = Column(String, default="Both") # Morning, Evening, Both
    active = Column(Boolean, default=True)
    photo = Column(String, nullable=True)
    photo2 = Column(String, nullable=True)
    member_number = Column(Integer, unique=True, index=True, nullable=True)
    cow_id = Column(Integer, ForeignKey("cows.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    assigned_cow = relationship("Cow", foreign_keys=[cow_id])
    assigned_cows = relationship("Cow", secondary=member_cows, lazy="joined")

class DailyDistribution(Base):
    __tablename__ = "daily_distribution"
    __table_args__ = (
        UniqueConstraint("member_id", "date", "shift", name="uix_daily_distribution_member_date_shift"),
    )

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
