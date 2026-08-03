import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app import crud, schemas
from app.core.config import settings

logger = logging.getLogger(__name__)

def init_db(db: Session) -> None:
    users_to_seed = [
        {
            "email": "admin@gauhostel.com",
            "password": "KBHAdmin123",
            "name": "Super Admin",
            "role": "Admin"
        },
        {
            "email": "entry@gauhostel.com",
            "password": "entrygauhostel",
            "name": "Milk Entry",
            "role": "Entry"
        },
        {
            "email": "viewer@gauhostel.com",
            "password": "viewergauhostel",
            "name": "Viewer",
            "role": "Viewer"
        },
        {
            "email": "gowal@gauhostel.com",
            "password": "gowalgauhostel",
            "name": "Gowal",
            "role": "Gowal"
        }
    ]

    for u in users_to_seed:
        user = crud.user.get_by_email(db, email=u["email"])
        if not user:
            user_in = schemas.UserCreate(**u)
            try:
                crud.user.create(db, obj_in=user_in)
                logger.info(f"User {u['email']} created successfully.")
            except IntegrityError:
                db.rollback()
                logger.info(f"User {u['email']} already exists (caught IntegrityError).")
        else:
            # If user exists, we update their password to ensure it matches the new requirement
            from app.core.security import get_password_hash
            user.password_hash = get_password_hash(u["password"])
            user.role = u["role"]
            db.commit()
            logger.info(f"User {u['email']} updated successfully.")
