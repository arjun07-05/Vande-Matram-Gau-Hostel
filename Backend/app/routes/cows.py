import os
import uuid
import qrcode
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from app.models.milk import MilkEntry
from app.models.member import Member, member_cows

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def calculate_time_duration(start_d: Optional[date], end_d: Optional[date] = None):
    if not start_d:
        return {"en": "-", "gu": "-", "days": 0}
    if not end_d:
        end_d = date.today()

    total_days = (end_d - start_d).days
    if total_days < 0:
        return {"en": "0 days", "gu": "૦ દિવસ", "days": 0}

    years = total_days // 365
    remaining_days = total_days % 365
    months = remaining_days // 30
    days = remaining_days % 30

    en_parts = []
    gu_parts = []

    if years > 0:
        en_parts.append(f"{years} yr" if years == 1 else f"{years} yrs")
        gu_parts.append(f"{years} વર્ષ")
    if months > 0:
        en_parts.append(f"{months} mo" if months == 1 else f"{months} મહિના")
        gu_parts.append(f"{months} મહિના")
    if years == 0 and months == 0:
        en_parts.append(f"{days} days")
        gu_parts.append(f"{days} દિવસ")

    return {
        "en": " ".join(en_parts) if en_parts else "0 days",
        "gu": " ".join(gu_parts) if gu_parts else "૦ દિવસ",
        "days": total_days
    }

@router.get("/", response_model=List[schemas.Cow])
def read_cows(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    cows = crud.cow.get_multi(db, skip=skip, limit=limit)
    return cows

@router.post("/", response_model=schemas.Cow)
async def create_cow(
    *,
    db: Session = Depends(deps.get_db),
    cow_number: str = Form(...),
    cow_name: str = Form(None),
    breed: str = Form(None),
    color: str = Form(None),
    birth_date: str = Form(None),
    purchase_date: str = Form(None),
    purchase_price: float = Form(None),
    type: str = Form(None),
    calf_type: str = Form(None),
    condition: str = Form(None),
    remarks: str = Form(None),
    photo: UploadFile = File(None),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    # Check duplicate
    if crud.cow.get_by_cow_number(db, cow_number=cow_number):
        raise HTTPException(status_code=400, detail="Cow number already exists")

    # Generate QR Code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(f"COW:{cow_number}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    qr_filename = f"qr_{uuid.uuid4().hex}.png"
    qr_path = os.path.join(UPLOAD_DIR, qr_filename)
    img.save(qr_path)

    # Save Photo if exists
    photo_path = None
    if photo and photo.filename:
        photo_filename = f"photo_{uuid.uuid4().hex}_{photo.filename}"
        photo_path = os.path.join(UPLOAD_DIR, photo_filename)
        with open(photo_path, "wb") as f:
            f.write(await photo.read())

    # Convert dates from string to date if provided
    from datetime import datetime
    b_date = datetime.strptime(birth_date, "%Y-%m-%d").date() if birth_date else None
    p_date = datetime.strptime(purchase_date, "%Y-%m-%d").date() if purchase_date else None

    obj_in = schemas.CowCreate(
        cow_number=cow_number,
        cow_name=cow_name,
        breed=breed,
        color=color,
        birth_date=b_date,
        purchase_date=p_date,
        purchase_price=purchase_price,
        type=type,
        calf_type=calf_type,
        condition=condition,
        remarks=remarks
    )

    # Auto-add custom cow type
    if type:
        existing_option = db.query(models.CowTypeOption).filter(models.CowTypeOption.name == type).first()
        if not existing_option:
            db.add(models.CowTypeOption(name=type))
            db.commit()

    cow = crud.cow.create(db, obj_in=obj_in)

    # Update with file paths
    db_obj = crud.cow.update(db, db_obj=cow, obj_in={"photo": photo_path, "qr_code": qr_path})

    # Record initial status history
    history_entry = models.CowStatusHistory(
        cow_id=cow.id,
        condition=cow.condition,
        type=cow.type,
        calf_type=cow.calf_type,
        change_date=p_date or b_date or date.today(),
        remarks=remarks or "Initial registration"
    )
    db.add(history_entry)
    db.commit()

    return db_obj

@router.get("/{cow_id}/details", response_model=schemas.CowDetailsResponse)
def get_cow_details(
    cow_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    cow = crud.cow.get(db, id=cow_id)
    if not cow:
        raise HTTPException(status_code=404, detail="Cow not found")

    # Milk statistics
    entries = db.query(MilkEntry).filter(MilkEntry.cow_id == cow_id).order_by(MilkEntry.date.desc()).all()

    total_qty = sum(e.milk_qty for e in entries)
    unique_dates = {e.date for e in entries}
    days_count = len(unique_dates)

    morning_entries = [e.milk_qty for e in entries if e.shift == "Morning"]
    evening_entries = [e.milk_qty for e in entries if e.shift == "Evening"]

    avg_morning = round(sum(morning_entries) / len(morning_entries), 2) if morning_entries else 0.0
    avg_evening = round(sum(evening_entries) / len(evening_entries), 2) if evening_entries else 0.0
    daily_avg = round(total_qty / days_count, 2) if days_count > 0 else 0.0

    # How much time calculation (prefer birth_date, fallback purchase_date, fallback created_at)
    calc_date = cow.birth_date or cow.purchase_date or (cow.created_at.date() if cow.created_at else None)
    time_info = calculate_time_duration(calc_date)

    stats = schemas.CowMilkStats(
        daily_avg_milk=daily_avg,
        morning_avg_milk=avg_morning,
        evening_avg_milk=avg_evening,
        total_milk_qty=round(total_qty, 2),
        milking_days_count=days_count,
        how_much_time=time_info["en"],
        how_much_time_gu=time_info["gu"],
        age_days=time_info["days"]
    )

    # Assigned Members
    assigned_members_query = db.query(Member).join(
        member_cows, Member.id == member_cows.c.member_id
    ).filter(member_cows.c.cow_id == cow_id).all()

    legacy_members = db.query(Member).filter(Member.cow_id == cow_id).all()
    all_members = list({m.id: m for m in (assigned_members_query + legacy_members)}.values())

    assigned_members_list = [
        schemas.AssignedMemberInfo(
            id=m.id,
            name=m.name,
            name2=m.name2,
            photo=m.photo,
            photo2=m.photo2,
            member_number=m.member_number,
            mobile=m.mobile,
            milk_preference=m.milk_preference
        )
        for m in all_members
    ]

    # Recent entries (last 15)
    recent_entries_data = [
        {
            "id": e.id,
            "date": str(e.date),
            "shift": e.shift,
            "milk_qty": e.milk_qty
        }
        for e in entries[:15]
    ]

    # Status History
    history_records = db.query(models.CowStatusHistory).filter(
        models.CowStatusHistory.cow_id == cow_id
    ).order_by(models.CowStatusHistory.change_date.desc(), models.CowStatusHistory.created_at.desc()).all()

    status_history_list = [
        schemas.CowStatusHistoryItem.model_validate(h) for h in history_records
    ]

    return schemas.CowDetailsResponse(
        cow=cow,
        stats=stats,
        assigned_members=assigned_members_list,
        status_history=status_history_list,
        recent_entries=recent_entries_data
    )

@router.post("/{cow_id}/photo", response_model=schemas.Cow)
async def upload_cow_photo(
    *,
    db: Session = Depends(deps.get_db),
    cow_id: int,
    photo: UploadFile = File(...),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    # Only Admin or Entry can upload photo
    if current_user.role not in ["Admin", "Entry"]:
        raise HTTPException(status_code=403, detail="Not enough permissions to upload photo")

    cow = crud.cow.get(db, id=cow_id)
    if not cow:
        raise HTTPException(status_code=404, detail="Cow not found")

    photo_filename = f"photo_{uuid.uuid4().hex}_{photo.filename}"
    photo_path = os.path.join(UPLOAD_DIR, photo_filename)
    with open(photo_path, "wb") as f:
        f.write(await photo.read())

    cow = crud.cow.update(db, db_obj=cow, obj_in={"photo": photo_path})
    return cow

@router.delete("/{cow_id}/photo", response_model=schemas.Cow)
def remove_cow_photo(
    *,
    db: Session = Depends(deps.get_db),
    cow_id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["Admin", "Entry"]:
        raise HTTPException(status_code=403, detail="Not enough permissions to remove photo")

    cow = crud.cow.get(db, id=cow_id)
    if not cow:
        raise HTTPException(status_code=404, detail="Cow not found")

    if cow.photo and os.path.exists(cow.photo):
        try:
            os.remove(cow.photo)
        except Exception:
            pass

    cow = crud.cow.update(db, db_obj=cow, obj_in={"photo": None})
    return cow

@router.put("/{cow_id}", response_model=schemas.Cow)
def update_cow(
    *,
    db: Session = Depends(deps.get_db),
    cow_id: int,
    cow_in: schemas.CowUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    if current_user.role not in ["Admin"]:
        raise HTTPException(status_code=403, detail="Only Admin can update cow details")

    cow = crud.cow.get(db, id=cow_id)
    if not cow:
        raise HTTPException(status_code=404, detail="Cow not found")

    # Check for duplicate cow_number on another cow
    if cow_in.cow_number and cow_in.cow_number != cow.cow_number:
        duplicate = db.query(models.Cow).filter(models.Cow.cow_number == cow_in.cow_number, models.Cow.id != cow_id).first()
        if duplicate:
            raise HTTPException(status_code=400, detail=f"ગાય નંબર '{cow_in.cow_number}' પહેલેથી જ અન્ય ગાય ({duplicate.cow_name or duplicate.cow_number}) પાસે છે.")

    if cow_in.type:
        existing_option = db.query(models.CowTypeOption).filter(models.CowTypeOption.name == cow_in.type).first()
        if not existing_option:
            db.add(models.CowTypeOption(name=cow_in.type))
            db.commit()

    old_condition = cow.condition
    old_type = cow.type
    old_calf_type = cow.calf_type

    status_changed = (
        (cow_in.condition is not None and cow_in.condition != old_condition) or
        (cow_in.type is not None and cow_in.type != old_type) or
        (cow_in.calf_type is not None and cow_in.calf_type != old_calf_type)
    )

    change_date = cow_in.change_date or date.today()

    try:
        cow = crud.cow.update(db, db_obj=cow, obj_in=cow_in)

        if status_changed:
            history_entry = models.CowStatusHistory(
                cow_id=cow.id,
                condition=cow.condition,
                type=cow.type,
                calf_type=cow.calf_type,
                change_date=change_date,
                remarks=cow_in.remarks
            )
            db.add(history_entry)
            db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating cow: {str(e)}")

    return cow

@router.delete("/{cow_id}", response_model=schemas.Cow)
def delete_cow(
    *,
    db: Session = Depends(deps.get_db),
    cow_id: int,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    cow = crud.cow.get(db, id=cow_id)
    if not cow:
        raise HTTPException(status_code=404, detail="Cow not found")
    cow = crud.cow.remove(db, id=cow_id)
    return cow

@router.get("/{cow_id}/chart")
def get_cow_chart(
    cow_id: int,
    db: Session = Depends(deps.get_db),
    days: int = 30,
) -> Any:
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    entries = db.query(MilkEntry).filter(
        MilkEntry.cow_id == cow_id,
        MilkEntry.date >= start_date,
        MilkEntry.date <= end_date
    ).all()

    dates = [str(start_date + timedelta(days=i)) for i in range(days + 1)]
    daily_data = {dt: {"morning": 0.0, "evening": 0.0, "total": 0.0} for dt in dates}

    for e in entries:
        d_str = str(e.date)
        qty = e.milk_qty
        if d_str in daily_data:
            if e.shift == "Morning":
                daily_data[d_str]["morning"] += qty
            else:
                daily_data[d_str]["evening"] += qty
    return {"dates": dates, "data": daily_data}

@router.post("/reorder")
def reorder_cows(
    *,
    db: Session = Depends(deps.get_db),
    reorder_in: schemas.CowReorderRequest,
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    try:
        # Step 1: Set temporary string values to eliminate unique constraint collision
        for item in reorder_in.order:
            db.query(models.Cow).filter(models.Cow.id == item.id).update(
                {"cow_number": f"__reorder_temp_{item.id}_{uuid.uuid4().hex[:6]}"}
            )
        db.flush()

        # Step 2: Set target sequential cow_number
        for item in reorder_in.order:
            db.query(models.Cow).filter(models.Cow.id == item.id).update(
                {"cow_number": item.cow_number}
            )
        db.commit()
        return {"success": True, "message": "Cows reordered successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to reorder cows: {str(e)}")
