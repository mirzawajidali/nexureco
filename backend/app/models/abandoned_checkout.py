from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.db.database import Base


class AbandonedCheckout(Base):
    """A bag saved when a customer fills in checkout details but hasn't placed the order (yet).

    The admin "Abandoned checkouts" page lists them for a one-click WhatsApp reminder whose link
    (/bag/<token>) restores the bag. Placing an order with the same token marks it recovered.
    """
    __tablename__ = "abandoned_checkouts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(64), unique=True, nullable=False, index=True)  # random id kept in the browser
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    first_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    # [{product_id, variant_id, quantity, name, slug, variant_info, price, image}]
    items = Column(JSON, nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)
    reminded_at = Column(DateTime(timezone=True), nullable=True)
    recovered_order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), index=True)
