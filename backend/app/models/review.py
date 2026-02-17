from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, SmallInteger, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    rating = Column(SmallInteger, nullable=False)
    title = Column(String(200), nullable=True)
    comment = Column(Text, nullable=True)
    is_approved = Column(Boolean, default=False, index=True)
    helpful_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="unique_user_product_review"),
    )

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
    images = relationship("ReviewImage", back_populates="review", cascade="all, delete-orphan")


class ReviewImage(Base):
    __tablename__ = "review_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    review = relationship("Review", back_populates="images")
