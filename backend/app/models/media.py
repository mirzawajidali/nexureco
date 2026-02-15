from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.sql import func
from app.db.database import Base


class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String(500), nullable=False, index=True)
    original_filename = Column(String(300), nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    content_type = Column(String(100), nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    alt_text = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class InventoryLog(Base):
    __tablename__ = "inventory_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity_change = Column(Integer, nullable=False)
    reason = Column(
        Enum("order_placed", "order_cancelled", "manual_adjustment", "restock", "return", name="inventory_reason"),
        nullable=False,
    )
    reference_id = Column(Integer, nullable=True)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
