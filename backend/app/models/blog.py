from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.db.database import Base


class BlogPost(Base):
    """A blog article (Admin → Blog), shown at /blog/<slug> and in the homepage blog slider."""

    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(220), unique=True, nullable=False, index=True)
    # Plain-text teaser for blog cards; the page description falls back to it
    excerpt = Column(String(500), nullable=True)
    content = Column(Text, nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    cover_image_alt = Column(String(300), nullable=True)
    category = Column(String(80), nullable=True, index=True)
    author_name = Column(String(100), nullable=True)
    reading_minutes = Column(Integer, nullable=False, default=1)
    is_published = Column(Boolean, nullable=False, default=False, index=True)
    # Featured posts come first in the homepage slider
    is_featured = Column(Boolean, nullable=False, default=False)
    meta_title = Column(String(200), nullable=True)
    meta_description = Column(String(500), nullable=True)
    # Set the first time the post is published (or by the admin); posts are listed newest first
    published_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
