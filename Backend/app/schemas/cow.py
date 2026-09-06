from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import date, datetime

class CowBase(BaseModel):
    cow_number: str
    cow_name: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[date] = None
    purchase_date: Optional[date] = None
    type: Optional[str] = None
    calf_type: Optional[str] = None
    condition: Optional[str] = None
    purchase_price: Optional[float] = None
    remarks: Optional[str] = None

class CowCreate(CowBase):
    pass

class CowUpdate(BaseModel):
    cow_number: Optional[str] = None
    cow_name: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[date] = None
    purchase_date: Optional[date] = None
    type: Optional[str] = None
    calf_type: Optional[str] = None
    condition: Optional[str] = None
    purchase_price: Optional[float] = None
    remarks: Optional[str] = None
    change_date: Optional[date] = None

class CowStatusHistoryItem(BaseModel):
    id: int
    cow_id: int
    condition: Optional[str] = None
    type: Optional[str] = None
    calf_type: Optional[str] = None
    change_date: date
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CowInDBBase(CowBase):
    id: int
    photo: Optional[str] = None
    qr_code: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Cow(CowInDBBase):
    pass

class CowMilkStats(BaseModel):
    daily_avg_milk: float = 0.0
    morning_avg_milk: float = 0.0
    evening_avg_milk: float = 0.0
    total_milk_qty: float = 0.0
    milking_days_count: int = 0
    how_much_time: Optional[str] = None
    how_much_time_gu: Optional[str] = None
    age_days: Optional[int] = None

class AssignedMemberInfo(BaseModel):
    id: int
    name: str
    name2: Optional[str] = None
    photo: Optional[str] = None
    photo2: Optional[str] = None
    member_number: Optional[int] = None
    mobile: str
    milk_preference: Optional[str] = "Both"

class CowDetailsResponse(BaseModel):
    cow: Cow
    stats: CowMilkStats
    assigned_members: List[AssignedMemberInfo] = []
    status_history: List[CowStatusHistoryItem] = []
    recent_entries: List[Any] = []

class CowReorderItem(BaseModel):
    id: int
    cow_number: str

class CowReorderRequest(BaseModel):
    order: List[CowReorderItem]
