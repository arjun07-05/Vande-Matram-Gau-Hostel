from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.session import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False) # e.g. "જગ્યાનું ભાડું", "ગોવાળ મહેશભાઈ પગાર", "દવા"
    category = Column(String, index=True, nullable=True, default="સામાન્ય")
    quantity = Column(Float, default=1.0, nullable=True)
    unit = Column(String, default="નંગ", nullable=True)
    price_per_unit = Column(Float, default=0.0, nullable=True)
    amount = Column(Float, nullable=False, default=0.0) # Total Amount in ₹
    expense_date = Column(Date, default=func.current_date(), nullable=False)
    month_year = Column(String, index=True, nullable=False) # e.g. "2026-09"
    payment_mode = Column(String, default="Cash", nullable=True) # Cash, Online/UPI, Bank Transfer
    paid_to = Column(String, nullable=True) # Recipient / Vendor name
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MemberMonthlyPayment(Base):
    __tablename__ = "member_monthly_payments"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    month_year = Column(String, index=True, nullable=False) # e.g. "2026-09"
    calculated_share = Column(Float, default=0.0, nullable=False)
    amount_paid = Column(Float, default=0.0, nullable=False)
    status = Column(String, default="Pending", nullable=False) # Paid, Pending, Partial
    payment_date = Column(Date, nullable=True)
    payment_mode = Column(String, default="Cash", nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    member = relationship("Member")
