from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.member import Member, DailyDistribution
from app.schemas.member import MemberCreate, MemberUpdate, DailyDistributionCreate, DailyDistributionUpdate

class CRUDMember(CRUDBase[Member, MemberCreate, MemberUpdate]):
    def get_by_mobile(self, db: Session, *, mobile: str) -> Optional[Member]:
        return db.query(Member).filter(Member.mobile == mobile).first()
        
    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[Member]:
        return db.query(Member).order_by(Member.member_number.asc().nulls_last()).offset(skip).limit(limit).all()

    def get_active_members(self, db: Session) -> List[Member]:
        return db.query(Member).filter(Member.active == True).order_by(Member.member_number.asc().nulls_last()).all()

class CRUDDailyDistribution(CRUDBase[DailyDistribution, DailyDistributionCreate, DailyDistributionUpdate]):
    def get_by_date(self, db: Session, *, target_date: date) -> List[DailyDistribution]:
        return db.query(DailyDistribution).filter(DailyDistribution.date == target_date).all()
        
    def get_by_member_date_shift(
        self, db: Session, *, member_id: int, target_date: date, shift: str
    ) -> Optional[DailyDistribution]:
        return db.query(DailyDistribution).filter(
            DailyDistribution.member_id == member_id,
            DailyDistribution.date == target_date,
            DailyDistribution.shift == shift
        ).first()

member = CRUDMember(Member)
distribution = CRUDDailyDistribution(DailyDistribution)
