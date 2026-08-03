from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import date, datetime
from .cow import Cow

class MilkEntryBase(BaseModel):
    cow_id: int
    date: date
    shift: str # Morning, Evening
    milk_qty: float = Field(ge=0, le=100)

class MilkEntryCreate(MilkEntryBase):
    pass

class MilkEntryUpdate(MilkEntryBase):
    pass

class MilkEntryInDBBase(MilkEntryBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MilkEntry(MilkEntryInDBBase):
    cow: Optional[Cow] = None

class BulkMilkEntry(BaseModel):
    entries: List[MilkEntryCreate]
