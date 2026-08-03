from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database.session import Base

class CowTypeOption(Base):
    __tablename__ = "cow_type_options"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
