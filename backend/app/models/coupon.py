from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Enum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(300), nullable=True)
    type = Column(Enum("percentage", "fixed_amount", name="coupon_type"), nullable=False)
    value = Column(Numeric(10, 2), nullable=False)
    min_order_amount = Column(Numeric(10, 2), default=0)
    max_discount = Column(Numeric(10, 2), nullable=True)
    usage_limit = Column(Integer, nullable=True)
    usage_per_customer = Column(Integer, default=1)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    usage_records = relationship("CouponUsage", back_populates="coupon", cascade="all, delete-orphan")


class CouponUsage(Base):
    __tablename__ = "coupon_usage"

    id = Column(Integer, primary_key=True, autoincrement=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    coupon = relationship("Coupon", back_populates="usage_records")
