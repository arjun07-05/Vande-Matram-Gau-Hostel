from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.cow import Cow
from app.schemas.cow import CowCreate, CowUpdate

class CRUDCow(CRUDBase[Cow, CowCreate, CowUpdate]):
    def get_by_cow_number(self, db: Session, *, cow_number: str) -> Optional[Cow]:
        return db.query(Cow).filter(Cow.cow_number == cow_number).first()
        
    def get_active_cows(self, db: Session) -> List[Cow]:
        return db.query(Cow).filter(Cow.type.in_(["milk", "Milk", "દૂધ આપતી", "દૂધ આપતી "])).all()

cow = CRUDCow(Cow)
