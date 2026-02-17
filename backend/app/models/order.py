from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, Enum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(30), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    guest_email = Column(String(255), nullable=True)
    status = Column(
        Enum("pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned", name="order_status"),
        default="pending", index=True,
    )
    payment_method = Column(Enum("cod", name="payment_method"), default="cod")
    payment_status = Column(Enum("pending", "paid", "refunded", name="payment_status"), default="pending")
    subtotal = Column(Numeric(10, 2), nullable=False)
    shipping_cost = Column(Numeric(10, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    tax_amount = Column(Numeric(10, 2), default=0)
    total = Column(Numeric(10, 2), nullable=False)
    coupon_id = Column(Integer, ForeignKey("coupons.id", ondelete="SET NULL"), nullable=True)
    coupon_code = Column(String(50), nullable=True)

    # Shipping address snapshot
    shipping_first_name = Column(String(100), nullable=True)
    shipping_last_name = Column(String(100), nullable=True)
    shipping_phone = Column(String(20), nullable=True)
    shipping_address1 = Column(String(255), nullable=True)
    shipping_address2 = Column(String(255), nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_state = Column(String(100), nullable=True)
    shipping_postal_code = Column(String(20), nullable=True)
    shipping_country = Column(String(100), nullable=True)

    # Tracking
    tracking_number = Column(String(100), nullable=True)
    tracking_url = Column(String(500), nullable=True)
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Notes
    customer_note = Column(Text, nullable=True)
    admin_note = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusHistory.created_at")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True, index=True)
    product_name = Column(String(300), nullable=False)
    variant_info = Column(String(200), nullable=True)
    sku = Column(String(100), nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(String(500), nullable=True)

    order = relationship("Order", back_populates="items")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False)
    note = Column(Text, nullable=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="status_history")
