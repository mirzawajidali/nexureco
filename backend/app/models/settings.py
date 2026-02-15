from sqlalchemy import Column, Integer, String, DateTime, Text, Enum
from sqlalchemy.sql import func
from app.db.database import Base


class StoreSetting(Base):
    __tablename__ = "store_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    setting_key = Column(String(100), unique=True, nullable=False, index=True)
    setting_value = Column(Text, nullable=True)
    setting_type = Column(Enum("string", "number", "boolean", "json", name="setting_type"), default="string")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
