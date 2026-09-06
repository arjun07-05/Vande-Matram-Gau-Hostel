from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from datetime import date

router = APIRouter()

@router.post("/", response_model=List[schemas.MilkEntry])
def create_bulk_milk_entries(
    *,
    db: Session = Depends(deps.get_db),
    bulk_in: schemas.BulkMilkEntry,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    results = []
    for entry_in in bulk_in.entries:
        # Check duplicate
        existing = crud.milk.get_by_cow_date_shift(
            db, cow_id=entry_in.cow_id, target_date=entry_in.date, shift=entry_in.shift
        )
        if existing:
            if entry_in.milk_qty is None or entry_in.milk_qty <= 0:
                # User cleared this entry
                db.delete(existing)
                db.commit()
            else:
                # Update existing
                obj = crud.milk.update(db, db_obj=existing, obj_in=entry_in)
                results.append(obj)
        else:
            if entry_in.milk_qty and entry_in.milk_qty > 0:
                # Create new only if milk_qty > 0
                obj_data = entry_in.model_dump()
                obj_data["created_by"] = current_user.id
                db_obj = models.MilkEntry(**obj_data)
                db.add(db_obj)
                db.commit()
                db.refresh(db_obj)
                results.append(db_obj)
    return results

@router.get("/today", response_model=List[schemas.MilkEntry])
def read_today_milk(
    db: Session = Depends(deps.get_db),
    target_date: date = None,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if not target_date:
        target_date = date.today()
    return db.query(models.MilkEntry).filter(models.MilkEntry.date == target_date).all()
