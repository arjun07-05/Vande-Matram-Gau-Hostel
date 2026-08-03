from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CowTypeOptionBase(BaseModel):
    name: str

class CowTypeOptionCreate(CowTypeOptionBase):
    pass

class CowTypeOption(CowTypeOptionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
