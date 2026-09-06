from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime

class ExpenseBase(BaseModel):
    title: str
    category: Optional[str] = "સામાન્ય"
    quantity: Optional[float] = 1.0
    unit: Optional[str] = "નંગ"
    price_per_unit: Optional[float] = 0.0
    amount: float
    expense_date: Optional[date] = None
    month_year: Optional[str] = None
    payment_mode: Optional[str] = "Cash"
    paid_to: Optional[str] = None
    remarks: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    price_per_unit: Optional[float] = None
    amount: Optional[float] = None
    expense_date: Optional[date] = None
    month_year: Optional[str] = None
    payment_mode: Optional[str] = None
    paid_to: Optional[str] = None
    remarks: Optional[str] = None

class ExpenseInDBBase(ExpenseBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Expense(ExpenseInDBBase):
    pass


class MemberPaymentRecordRequest(BaseModel):
    member_id: int
    month_year: str
    amount_paid: float
    status: str = "Paid" # Paid, Pending, Partial
    payment_date: Optional[date] = None
    payment_mode: Optional[str] = "Cash"
    remarks: Optional[str] = None

class MemberMonthlyPaymentResponse(BaseModel):
    id: int
    member_id: int
    month_year: str
    calculated_share: float = 0.0
    amount_paid: float = 0.0
    status: str = "Paid"
    payment_date: Optional[date] = None
    payment_mode: Optional[str] = None
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MemberShareItem(BaseModel):
    member_id: int
    member_number: Optional[str] = None
    name: str
    name2: Optional[str] = None
    assigned_cows_count: int = 0
    assigned_cows_names: List[str] = []
    milk_preference: Optional[str] = None
    calculated_share: float = 0.0
    amount_paid: float = 0.0
    status: str = "Pending"
    payment_date: Optional[date] = None
    payment_mode: Optional[str] = None
    remarks: Optional[str] = None


class MaterialUsageCostItem(BaseModel):
    item_name: str
    quantity_used: float
    unit: str
    avg_price_per_unit: float
    total_cost: float


class MonthlyCostSummaryResponse(BaseModel):
    month_year: str # e.g. "2026-09"
    total_material_cost: float
    total_operational_expense: float
    total_monthly_cost: float
    total_members_count: int
    per_member_cost: float
    material_costs: List[MaterialUsageCostItem] = []
    expenses: List[Expense] = []
    members_shares: List[MemberShareItem] = []
