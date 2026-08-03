from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database.session import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user = Column(String, nullable=False)
    action = Column(String, nullable=False)
    module = Column(String, nullable=False)
    description = Column(String, nullable=False)
    date = Column(DateTime(timezone=True), server_default=func.now())
