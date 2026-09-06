from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime

class MaterialBase(BaseModel):
    item_name: str
    quantity: float = 1.0
    unit: str = "નંગ"
    price_per_unit: float = 0.0
    total_price: Optional[float] = 0.0
    purchase_date: Optional[date] = None
    supplier: Optional[str] = None
    remarks: Optional[str] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    item_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    price_per_unit: Optional[float] = None
    total_price: Optional[float] = None
    purchase_date: Optional[date] = None
    supplier: Optional[str] = None
    remarks: Optional[str] = None

class MaterialInDBBase(MaterialBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Material(MaterialInDBBase):
    pass

class MaterialUsageBase(BaseModel):
    item_name: str
    quantity_used: float = 1.0
    unit: str = "નંગ"
    usage_date: Optional[date] = None
    purpose: Optional[str] = None
    remarks: Optional[str] = None

class MaterialUsageCreate(MaterialUsageBase):
    pass

class MaterialUsageUpdate(BaseModel):
    item_name: Optional[str] = None
    quantity_used: Optional[float] = None
    unit: Optional[str] = None
    usage_date: Optional[date] = None
    purpose: Optional[str] = None
    remarks: Optional[str] = None

class MaterialUsage(MaterialUsageBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InventorySummaryItem(BaseModel):
    item_name: str
    unit: str
    total_purchased_qty: float
    total_purchased_amount: float
    avg_price_per_unit: float
    last_purchase_price: float
    last_purchase_date: Optional[date] = None
    suppliers: List[str] = []
    total_used_qty: float
    balance_qty: float
    balance_valuation: float

class MaterialContributionBase(BaseModel):
    member_id: int
    amount: float
    contribution_date: Optional[date] = None
    payment_mode: Optional[str] = "Cash"
    remarks: Optional[str] = None

class MaterialContributionCreate(MaterialContributionBase):
    pass

class MaterialContributionUpdate(BaseModel):
    member_id: Optional[int] = None
    amount: Optional[float] = None
    contribution_date: Optional[date] = None
    payment_mode: Optional[str] = None
    remarks: Optional[str] = None

class MaterialContribution(MaterialContributionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Enriched member info
    member_name: Optional[str] = None
    member_name2: Optional[str] = None
    member_number: Optional[str] = None
    assigned_cows_count: Optional[int] = 0

    class Config:
        from_attributes = True

class BulkMaterialContributionCreate(BaseModel):
    amount_per_member: float
    contribution_date: Optional[date] = None
    payment_mode: Optional[str] = "Cash"
    remarks: Optional[str] = None

class MemberContributionLedgerItem(BaseModel):
    member_id: int
    member_number: Optional[str] = None
    name: str
    name2: Optional[str] = None
    assigned_cows_count: int = 0
    total_contributed: float = 0.0
    last_contribution_date: Optional[date] = None
    last_payment_mode: Optional[str] = None
    last_remarks: Optional[str] = None
    contributions_count: int = 0

class MaterialFundSummaryResponse(BaseModel):
    total_collected_fund: float # Total ₹ collected from members
    total_material_expense: float # Total ₹ spent on purchasing materials
    net_fund_balance: float # total_collected_fund - total_material_expense
    total_members_count: int
    contributing_members_count: int
    member_contributions: List[MemberContributionLedgerItem] = []
