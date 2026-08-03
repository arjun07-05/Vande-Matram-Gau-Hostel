from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.settings import Settings
from app.schemas.settings import SettingsCreate, SettingsUpdate

class CRUDSettings(CRUDBase[Settings, SettingsCreate, SettingsUpdate]):
    def get_settings(self, db: Session) -> Settings:
        settings = db.query(Settings).first()
        if not settings:
            settings = Settings()
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings

settings = CRUDSettings(Settings)
