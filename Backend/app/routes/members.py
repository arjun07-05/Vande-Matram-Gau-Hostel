import os
import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models.member import DailyDistribution

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", response_model=List[schemas.Member])
def read_members(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    return crud.member.get_multi(db, skip=skip, limit=limit)

@router.post("/", response_model=schemas.Member)
async def create_member(
    *,
    db: Session = Depends(deps.get_db),
    name: str = Form(...),
    mobile: str = Form(...),
    address: str = Form(None),
    family_members: int = Form(1),
    milk_preference: str = Form("Both"),
    active: bool = Form(True),
    member_number: int = Form(None),
    photo: UploadFile = File(None),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if crud.member.get_by_mobile(db, mobile=mobile):
        raise HTTPException(status_code=400, detail="Mobile number already exists")

    photo_path = None
    if photo:
        photo_filename = f"member_{uuid.uuid4().hex}_{photo.filename}"
        photo_path = os.path.join(UPLOAD_DIR, photo_filename)
        with open(photo_path, "wb") as f:
            f.write(await photo.read())

    obj_in = schemas.MemberCreate(
        name=name,
        mobile=mobile,
        address=address,
        family_members=family_members,
        milk_preference=milk_preference,
        active=active,
        member_number=member_number
    )
    
    member = crud.member.create(db, obj_in=obj_in)
    if photo_path:
        member = crud.member.update(db, db_obj=member, obj_in={"photo": photo_path})
    return member

@router.put("/{member_id}", response_model=schemas.Member)
def update_member(
    *,
    db: Session = Depends(deps.get_db),
    member_id: int,
    member_in: schemas.MemberUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    member = crud.member.get(db, id=member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member = crud.member.update(db, db_obj=member, obj_in=member_in)
    return member

@router.delete("/{member_id}", response_model=schemas.Member)
def delete_member(
    *,
    db: Session = Depends(deps.get_db),
    member_id: int,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    member = crud.member.get(db, id=member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member = crud.member.remove(db, id=member_id)
    return member

@router.get("/{member_id}/chart")
def get_member_chart(
    member_id: int,
    db: Session = Depends(deps.get_db),
    days: int = 30,
) -> Any:
    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    
    dists = db.query(DailyDistribution).filter(
        (DailyDistribution.member_id == member_id) | 
        (DailyDistribution.assigned_to_id == member_id),
        DailyDistribution.date >= start_date,
        DailyDistribution.date <= end_date,
        DailyDistribution.received == True
    ).all()

    dates = [str(start_date + timedelta(days=i)) for i in range(days + 1)]
    daily_data = {dt: {"morning": 0.0, "evening": 0.0, "total": 0.0} for dt in dates}

    for d in dists:
        d_str = str(d.date)
        qty = d.milk_qty
        if d_str in daily_data:
            if d.shift == "Morning":
                daily_data[d_str]["morning"] += qty
            else:
                daily_data[d_str]["evening"] += qty
            daily_data[d_str]["total"] += qty

    return {"dates": dates, "data": daily_data}
