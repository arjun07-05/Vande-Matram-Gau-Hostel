import logging
from sqlalchemy.orm import Session
from app import crud, schemas, models
from app.core.config import settings
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

def init_db(db: Session) -> None:
    """
    Initial database seeding for fresh installations.
    Schema creation and migrations are strictly managed by Alembic.
    Only seeds the initial admin and default settings if no data exists.
    """
    try:
        # 1. Seed initial settings if none exist
        existing_settings = crud.settings.get_settings(db)
        if not existing_settings:
            default_settings = models.Settings(
                morning_gowal_milk=2.0,
                evening_gowal_milk=2.0,
                morning_other_milk=0.0,
                evening_other_milk=0.0,
                unit="Liter",
                member_mode="Automatic"
            )
            db.add(default_settings)
            db.commit()
            logger.info("Default application settings initialized.")

        # 2. Seed initial administrator ONLY if no users exist in the system
        user_count = db.query(models.User).count()
        if user_count == 0:
            admin_in = schemas.UserCreate(
                email=settings.INITIAL_ADMIN_EMAIL,
                password=settings.INITIAL_ADMIN_PASSWORD,
                name=settings.INITIAL_ADMIN_NAME,
                role="Admin"
            )
            crud.user.create(db, obj_in=admin_in)
            logger.info(f"Initial administrator ({settings.INITIAL_ADMIN_EMAIL}) created successfully.")
        else:
            logger.info("Users exist in database; skipping initial user seeding.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error during init_db check: {e}")
