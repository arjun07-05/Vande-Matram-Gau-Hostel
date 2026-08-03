from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime

class MemberBase(BaseModel):
    name: str
    mobile: str
    address: Optional[str] = None
    family_members: int = 1
    milk_preference: str = "Both"
    active: bool = True
    member_number: Optional[int] = None

class MemberCreate(MemberBase):
    pass

class MemberUpdate(MemberBase):
    mobile: Optional[str] = None

class MemberInDBBase(MemberBase):
    id: int
    photo: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Member(MemberInDBBase):
    pass

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
