from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.get("/", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    today = date.today()

    # Milk stats
    morning_entries = crud.milk.get_by_date_and_shift(db, target_date=today, shift="Morning")
    evening_entries = crud.milk.get_by_date_and_shift(db, target_date=today, shift="Evening")

    morning_milk = sum(e.milk_qty for e in morning_entries)
    evening_milk = sum(e.milk_qty for e in evening_entries)

    settings = crud.settings.get_settings(db)
    morning_gowal_milk = settings.morning_gowal_milk
    evening_gowal_milk = settings.evening_gowal_milk
    morning_other_milk = settings.morning_other_milk or 0.0
    evening_other_milk = settings.evening_other_milk or 0.0

    morning_remaining_milk = max(0, morning_milk - morning_gowal_milk - morning_other_milk)
    evening_remaining_milk = max(0, evening_milk - evening_gowal_milk - evening_other_milk)

    # Member & Cow stats
    active_members_list = crud.member.get_active_members(db)

    morning_members = len([m for m in active_members_list if m.milk_preference in ["Morning", "Both"]])
    evening_members = len([m for m in active_members_list if m.milk_preference in ["Evening", "Both"]])

    morning_milk_per_member = morning_remaining_milk / morning_members if morning_members > 0 else 0
    evening_milk_per_member = evening_remaining_milk / evening_members if evening_members > 0 else 0

    # Milking cows
    active_cows = crud.cow.get_active_cows(db)
    milking_cows = len(active_cows)

    return {
        "milking_cows": milking_cows,
        "morning_milk": morning_milk,
        "evening_milk": evening_milk,
        "morning_gowal_milk": morning_gowal_milk,
        "evening_gowal_milk": evening_gowal_milk,
        "morning_other_milk": morning_other_milk,
        "evening_other_milk": evening_other_milk,
        "morning_remaining_milk": morning_remaining_milk,
        "evening_remaining_milk": evening_remaining_milk,
        "morning_members": morning_members,
        "evening_members": evening_members,
        "morning_milk_per_member": morning_milk_per_member,
        "evening_milk_per_member": evening_milk_per_member
    }
