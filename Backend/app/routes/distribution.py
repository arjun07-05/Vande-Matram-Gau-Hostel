from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

@router.post("/generate", response_model=List[schemas.DailyDistribution])
def generate_distribution(
    *,
    db: Session = Depends(deps.get_db),
    target_date: date,
    shift: str,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    # Get total milk for the shift
    milk_entries = crud.milk.get_by_date_and_shift(db, target_date=target_date, shift=shift)
    total_milk = sum(entry.milk_qty for entry in milk_entries)
    
    settings = crud.settings.get_settings(db)
    gowal_milk = settings.morning_gowal_milk if shift == 'Morning' else settings.evening_gowal_milk
    
    remaining_milk = total_milk - gowal_milk
    if remaining_milk < 0:
        remaining_milk = 0

    active_members = crud.member.get_active_members(db)
    
    # Filter members by preference
    eligible_members = []
    for m in active_members:
        if m.milk_preference == "Both" or m.milk_preference == shift:
            eligible_members.append(m)

    if not eligible_members:
        return []

    milk_per_member = remaining_milk / len(eligible_members) if remaining_milk > 0 else 0

    results = []
    for member in eligible_members:
        existings = db.query(models.DailyDistribution).filter(
            models.DailyDistribution.member_id == member.id,
            models.DailyDistribution.date == target_date,
            models.DailyDistribution.shift == shift
        ).all()
        
        if not existings:
            obj_in = schemas.DailyDistributionCreate(
                member_id=member.id,
                date=target_date,
                shift=shift,
                milk_qty=milk_per_member
            )
            obj = crud.distribution.create(db, obj_in=obj_in)
            results.append(obj)
        else:
            existing = existings[0]
            # Delete duplicates if any due to React Strict Mode double-mounting race condition
            if len(existings) > 1:
                for extra in existings[1:]:
                    db.delete(extra)
                db.commit()
                
            # Update quantity if not received
            if not existing.received:
                obj = crud.distribution.update(db, db_obj=existing, obj_in={"milk_qty": milk_per_member})
                results.append(obj)
            else:
                results.append(existing)
    return results

@router.post("/manual", response_model=schemas.DailyDistribution)
def manual_distribution(
    *,
    db: Session = Depends(deps.get_db),
    target_date: date,
    shift: str,
    member_id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    # 1. Calculate milk_per_member exactly like generate
    milk_entries = crud.milk.get_by_date_and_shift(db, target_date=target_date, shift=shift)
    total_milk = sum(entry.milk_qty for entry in milk_entries)
    
    settings = crud.settings.get_settings(db)
    gowal_milk = settings.morning_gowal_milk if shift == 'Morning' else settings.evening_gowal_milk
    remaining_milk = max(0, total_milk - gowal_milk)

    active_members = crud.member.get_active_members(db)
    eligible_members = [m for m in active_members if m.milk_preference in ("Both", shift)]
    
    milk_per_member = remaining_milk / len(eligible_members) if remaining_milk > 0 and eligible_members else 0

    # 2. Check if this member already has an entry
    existings = db.query(models.DailyDistribution).filter(
        models.DailyDistribution.member_id == member_id,
        models.DailyDistribution.date == target_date,
        models.DailyDistribution.shift == shift
    ).all()
    
    if not existings:
        obj_in = schemas.DailyDistributionCreate(
            member_id=member_id,
            date=target_date,
            shift=shift,
            milk_qty=milk_per_member
        )
        obj = crud.distribution.create(db, obj_in=obj_in)
    else:
        existing = existings[0]
        if len(existings) > 1:
            for extra in existings[1:]:
                db.delete(extra)
            db.commit()
            
        # Update existing
        obj = crud.distribution.update(db, db_obj=existing, obj_in={"milk_qty": milk_per_member})
        
    return obj

@router.get("/", response_model=List[schemas.DailyDistribution])
def get_distribution(
    db: Session = Depends(deps.get_db),
    target_date: date = None,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if not target_date:
        target_date = date.today()
    return crud.distribution.get_by_date(db, target_date=target_date)

@router.put("/receive/{dist_id}", response_model=schemas.DailyDistribution)
def receive_milk(
    *,
    db: Session = Depends(deps.get_db),
    dist_id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    dist = crud.distribution.get(db, id=dist_id)
    if not dist:
        raise HTTPException(status_code=404, detail="Distribution entry not found")
    
    if dist.received:
        obj_in = {
            "received": False,
            "received_time": None,
            "received_by": None
        }
    else:
        obj_in = {
            "received": True,
            "received_time": datetime.now(),
            "received_by": current_user.id
        }
    dist = crud.distribution.update(db, db_obj=dist, obj_in=obj_in)
    return dist

@router.put("/reassign/{dist_id}", response_model=schemas.DailyDistribution)
def reassign_distribution(
    *,
    db: Session = Depends(deps.get_db),
    dist_id: int,
    new_member_id: int = None,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    dist = crud.distribution.get(db, id=dist_id)
    if not dist:
        raise HTTPException(status_code=404, detail="Distribution entry not found")
    
    # Just update the assigned_to_id to indicate someone else is picking it up
    dist = crud.distribution.update(db, db_obj=dist, obj_in={"assigned_to_id": new_member_id})
    return dist
