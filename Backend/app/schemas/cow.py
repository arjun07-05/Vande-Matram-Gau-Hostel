from typing import Optional
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
    remarks: Optional[str] = None

class CowCreate(CowBase):
    pass

class CowUpdate(CowBase):
    cow_number: Optional[str] = None

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
