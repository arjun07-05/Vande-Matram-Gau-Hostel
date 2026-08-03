from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.milk import MilkEntry
from app.schemas.milk import MilkEntryCreate, MilkEntryUpdate

class CRUDMilkEntry(CRUDBase[MilkEntry, MilkEntryCreate, MilkEntryUpdate]):
    def get_by_date_and_shift(
        self, db: Session, *, target_date: date, shift: str
    ) -> List[MilkEntry]:
        return db.query(MilkEntry).filter(
            MilkEntry.date == target_date,
            MilkEntry.shift == shift
        ).all()
        
    def get_by_cow_date_shift(
        self, db: Session, *, cow_id: int, target_date: date, shift: str
    ) -> Optional[MilkEntry]:
        return db.query(MilkEntry).filter(
            MilkEntry.cow_id == cow_id,
            MilkEntry.date == target_date,
            MilkEntry.shift == shift
        ).first()

milk = CRUDMilkEntry(MilkEntry)
