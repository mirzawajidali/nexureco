from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text,
    Numeric, Enum, JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(300), nullable=False)
    slug = Column(String(320), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    short_description = Column(String(500), nullable=True)
    base_price = Column(Numeric(10, 2), nullable=False)
    compare_at_price = Column(Numeric(10, 2), nullable=True)
    cost_price = Column(Numeric(10, 2), nullable=True)
    sku = Column(String(100), nullable=True)
    barcode = Column(String(100), nullable=True)
    weight = Column(Numeric(8, 2), nullable=True)
    status = Column(Enum("active", "draft", "archived", name="product_status"), default="draft", index=True)
    is_featured = Column(Boolean, default=False, index=True)
    requires_shipping = Column(Boolean, default=True)
    tags = Column(JSON, nullable=True)
    meta_title = Column(String(200), nullable=True)
    meta_description = Column(String(500), nullable=True)
    # Rich content sections (Adidas-style accordion data)
    size_and_fit = Column(JSON, nullable=True)       # {"fit_type": "Regular fit", "model_info": "...", "size_guide_url": "..."}
    care_instructions = Column(JSON, nullable=True)  # {"washing": [...], "extra_care": [...]}
    material_info = Column(JSON, nullable=True)       # {"composition": "55% cotton...", "features": [...]}
    total_sold = Column(Integer, default=0)
    avg_rating = Column(Numeric(3, 2), default=0)
    review_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.display_order")
    options = relationship("ProductOption", back_populates="product", cascade="all, delete-orphan", order_by="ProductOption.display_order")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    collections = relationship("CollectionProduct", back_populates="product", cascade="all, delete-orphan")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    alt_text = Column(String(300), nullable=True)
    display_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="images")


class ProductOption(Base):
    __tablename__ = "product_options"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    display_order = Column(Integer, default=0)

    product = relationship("Product", back_populates="options")
    values = relationship("ProductOptionValue", back_populates="option", cascade="all, delete-orphan", order_by="ProductOptionValue.display_order")


class ProductOptionValue(Base):
    __tablename__ = "product_option_values"

    id = Column(Integer, primary_key=True, autoincrement=True)
    option_id = Column(Integer, ForeignKey("product_options.id", ondelete="CASCADE"), nullable=False, index=True)
    value = Column(String(100), nullable=False)
    display_order = Column(Integer, default=0)

    option = relationship("ProductOption", back_populates="values")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), unique=True, nullable=True, index=True)
    barcode = Column(String(100), nullable=True)
    price = Column(Numeric(10, 2), nullable=True)
    compare_at_price = Column(Numeric(10, 2), nullable=True)
    cost_price = Column(Numeric(10, 2), nullable=True)
    weight = Column(Numeric(8, 2), nullable=True)
    stock_quantity = Column(Integer, default=0, index=True)
    low_stock_threshold = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    product = relationship("Product", back_populates="variants")
    option_values = relationship("VariantOptionValue", back_populates="variant", cascade="all, delete-orphan")


class VariantOptionValue(Base):
    __tablename__ = "variant_option_values"

    variant_id = Column(Integer, ForeignKey("product_variants.id", ondelete="CASCADE"), primary_key=True)
    option_value_id = Column(Integer, ForeignKey("product_option_values.id", ondelete="CASCADE"), primary_key=True)

    variant = relationship("ProductVariant", back_populates="option_values")
    option_value = relationship("ProductOptionValue")
