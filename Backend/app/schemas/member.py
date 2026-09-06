from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
from app.schemas.cow import Cow

class MemberBase(BaseModel):
    name: str
    name2: Optional[str] = None
    mobile: str
    address: Optional[str] = None
    family_members: int = 1
    milk_preference: str = "Both"
    active: bool = True
    member_number: Optional[int] = None
    cow_id: Optional[int] = None

class MemberCreate(MemberBase):
    pass

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    name2: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    family_members: Optional[int] = None
    milk_preference: Optional[str] = None
    active: Optional[bool] = None
    member_number: Optional[int] = None
    cow_id: Optional[int] = None
    photo: Optional[str] = None
    photo2: Optional[str] = None

class MemberAssignCow(BaseModel):
    cow_id: Optional[int] = None
    cow_ids: Optional[List[int]] = None

class MemberInDBBase(MemberBase):
    id: int
    photo: Optional[str] = None
    photo2: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Member(MemberInDBBase):
    assigned_cow: Optional[Cow] = None
    assigned_cows: List[Cow] = []

class DailyDistributionBase(BaseModel):
    member_id: int
    date: date
    shift: str
    milk_qty: float

class DailyDistributionCreate(DailyDistributionBase):
    pass

class DailyDistributionUpdate(DailyDistributionBase):
    pass

class DailyDistributionInDBBase(DailyDistributionBase):
    id: int
    received: bool
    received_time: Optional[datetime] = None
    received_by: Optional[int] = None
    assigned_to_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DailyDistribution(DailyDistributionInDBBase):
    member: Optional[Member] = None
    assigned_to: Optional[Member] = None

class MemberReorderItem(BaseModel):
    id: int
    member_number: int

class MemberReorderRequest(BaseModel):
    order: List[MemberReorderItem]
