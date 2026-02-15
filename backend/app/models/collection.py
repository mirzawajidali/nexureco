from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(220), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    type = Column(Enum("manual", "automated", name="collection_type"), default="manual")
    rules_json = Column(JSON, nullable=True)
    is_featured = Column(Boolean, default=False, index=True)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    meta_title = Column(String(200), nullable=True)
    meta_description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    products = relationship("CollectionProduct", back_populates="collection", cascade="all, delete-orphan")


class CollectionProduct(Base):
    __tablename__ = "collection_products"

    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    display_order = Column(Integer, default=0)

    collection = relationship("Collection", back_populates="products")
    product = relationship("Product", back_populates="collections")
