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
    name2: str = Form(None),
    mobile: str = Form(...),
    address: str = Form(None),
    family_members: int = Form(1),
    milk_preference: str = Form("Both"),
    active: bool = Form(True),
    member_number: int = Form(None),
    cow_id: int = Form(None),
    photo: UploadFile = File(None),
    photo2: UploadFile = File(None),
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

    photo2_path = None
    if photo2:
        photo2_filename = f"member2_{uuid.uuid4().hex}_{photo2.filename}"
        photo2_path = os.path.join(UPLOAD_DIR, photo2_filename)
        with open(photo2_path, "wb") as f:
            f.write(await photo2.read())

    obj_in = schemas.MemberCreate(
        name=name,
        name2=name2,
        mobile=mobile,
        address=address,
        family_members=family_members,
        milk_preference=milk_preference,
        active=active,
        member_number=member_number,
        cow_id=cow_id
    )

    member = crud.member.create(db, obj_in=obj_in)
    update_data = {}
    if photo_path:
        update_data["photo"] = photo_path
    if photo2_path:
        update_data["photo2"] = photo2_path
    if update_data:
        member = crud.member.update(db, db_obj=member, obj_in=update_data)
    return member

@router.put("/{member_id}/assign-cow", response_model=schemas.Member)
def assign_cow_to_member(
    *,
    db: Session = Depends(deps.get_db),
    member_id: int,
    assignment_in: schemas.MemberAssignCow,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    member = crud.member.get(db, id=member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if assignment_in.cow_ids is not None:
        if len(assignment_in.cow_ids) > 0:
            cows = db.query(models.Cow).filter(models.Cow.id.in_(assignment_in.cow_ids)).all()
            member.assigned_cows = cows
            member.cow_id = cows[0].id if cows else None
        else:
            member.assigned_cows = []
            member.cow_id = None
    elif assignment_in.cow_id is not None:
        cow = crud.cow.get(db, id=assignment_in.cow_id)
        if not cow:
            raise HTTPException(status_code=404, detail="Cow not found")
        member.assigned_cows = [cow]
        member.cow_id = cow.id
    else:
        # None passed - clear assignments
        member.assigned_cows = []
        member.cow_id = None

    db.add(member)
    db.commit()
    db.refresh(member)
    return member

@router.post("/{member_id}/photo", response_model=schemas.Member)
async def upload_member_photo(
    *,
    db: Session = Depends(deps.get_db),
    member_id: int,
    photo: UploadFile = File(...),
    slot: int = 1,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["Admin", "Entry"]:
        raise HTTPException(status_code=403, detail="Not enough permissions to upload photo")

    member = crud.member.get(db, id=member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    photo_filename = f"member_{slot}_{uuid.uuid4().hex}_{photo.filename}"
    photo_path = os.path.join(UPLOAD_DIR, photo_filename)
    with open(photo_path, "wb") as f:
        f.write(await photo.read())

    field_name = "photo2" if slot == 2 else "photo"
    member = crud.member.update(db, db_obj=member, obj_in={field_name: photo_path})
    return member

@router.delete("/{member_id}/photo", response_model=schemas.Member)
def remove_member_photo(
    *,
    db: Session = Depends(deps.get_db),
    member_id: int,
    slot: int = 1,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["Admin", "Entry"]:
        raise HTTPException(status_code=403, detail="Not enough permissions to remove photo")

    member = crud.member.get(db, id=member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    field_name = "photo2" if slot == 2 else "photo"
    existing_photo = getattr(member, field_name, None)
    if existing_photo and os.path.exists(existing_photo):
        try:
            os.remove(existing_photo)
        except Exception:
            pass

    member = crud.member.update(db, db_obj=member, obj_in={field_name: None})
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

@router.post("/reorder")
def reorder_members(
    *,
    db: Session = Depends(deps.get_db),
    reorder_in: schemas.MemberReorderRequest,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    try:
        # Step 1: Set temporary offset to eliminate unique collision during renumbering
        for item in reorder_in.order:
            db.query(models.Member).filter(models.Member.id == item.id).update(
                {"member_number": -(item.member_number + 100000)}
            )
        db.flush()

        # Step 2: Set target sequential member_number
        for item in reorder_in.order:
            db.query(models.Member).filter(models.Member.id == item.id).update(
                {"member_number": item.member_number}
            )
        db.commit()
        return {"success": True, "message": "Members reordered successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to reorder members: {str(e)}")
