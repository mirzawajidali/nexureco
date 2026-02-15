from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from app.db.database import Base


class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=True)
    subtitle = Column(String(300), nullable=True)
    image_url = Column(String(500), nullable=False)
    mobile_image_url = Column(String(500), nullable=True)
    link_url = Column(String(500), nullable=True)
    button_text = Column(String(100), nullable=True)
    position = Column(Enum("hero", "promo", "announcement", name="banner_position"), default="hero", index=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
