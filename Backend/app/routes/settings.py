import os
import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

UPLOAD_DIR = "uploads"

@router.get("/", response_model=schemas.Settings)
def read_settings(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    return crud.settings.get_settings(db)

@router.put("/", response_model=schemas.Settings)
async def update_settings(
    *,
    db: Session = Depends(deps.get_db),
    morning_gowal_milk: float = Form(...),
    evening_gowal_milk: float = Form(...),
    morning_other_milk: float = Form(0.0),
    evening_other_milk: float = Form(0.0),
    unit: str = Form("Liter"),
    member_mode: str = Form("Automatic"),
    logo: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(deps.get_current_active_admin),
) -> Any:
    settings_obj = crud.settings.get_settings(db)

    update_data = {
        "morning_gowal_milk": morning_gowal_milk,
        "evening_gowal_milk": evening_gowal_milk,
        "morning_other_milk": morning_other_milk,
        "evening_other_milk": evening_other_milk,
        "unit": unit,
        "member_mode": member_mode
    }

    if logo:
        logo_filename = f"logo_{uuid.uuid4().hex}_{logo.filename}"
        logo_path = os.path.join(UPLOAD_DIR, logo_filename)
        with open(logo_path, "wb") as f:
            f.write(await logo.read())
        update_data["logo"] = logo_path

    return crud.settings.update(db, db_obj=settings_obj, obj_in=update_data)
