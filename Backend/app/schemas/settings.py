from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class SettingsBase(BaseModel):
    morning_gowal_milk: float = 2.0
    evening_gowal_milk: float = 2.0
    unit: str = "Liter"
    member_mode: str = "Automatic"

class SettingsCreate(SettingsBase):
    pass

class SettingsUpdate(SettingsBase):
    pass

class SettingsInDBBase(SettingsBase):
    id: int
    logo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Settings(SettingsInDBBase):
    pass
