import os
import uuid
import qrcode
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models.milk import MilkEntry

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    type: str = Form(None),
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
    if photo:
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
        type=type,
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
    return db_obj

@router.put("/{cow_id}", response_model=schemas.Cow)
def update_cow(
    *,
    db: Session = Depends(deps.get_db),
    cow_id: int,
    cow_in: schemas.CowUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    cow = crud.cow.get(db, id=cow_id)
    if not cow:
        raise HTTPException(status_code=404, detail="Cow not found")
        
    if cow_in.type:
        existing_option = db.query(models.CowTypeOption).filter(models.CowTypeOption.name == cow_in.type).first()
        if not existing_option:
            db.add(models.CowTypeOption(name=cow_in.type))
            db.commit()
            
    cow = crud.cow.update(db, db_obj=cow, obj_in=cow_in)
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
            daily_data[d_str]["total"] += qty

    return {"dates": dates, "data": daily_data}
