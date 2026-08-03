from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.cow_type_option import CowTypeOption
from app import schemas
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[schemas.CowTypeOption])
def read_cow_type_options(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    options = db.query(CowTypeOption).all()
    return options

@router.delete("/{option_id}")
def delete_cow_type_option(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    option = db.query(CowTypeOption).filter(CowTypeOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    
    db.delete(option)
    db.commit()
    return {"message": "Option deleted"}
