from typing import List, Dict, Any
from pydantic import BaseModel

class DashboardStats(BaseModel):
    milking_cows: int
    morning_milk: float
    evening_milk: float
    morning_gowal_milk: float
    evening_gowal_milk: float
    morning_remaining_milk: float
    evening_remaining_milk: float
    morning_members: int
    evening_members: int
    morning_milk_per_member: float
    evening_milk_per_member: float
