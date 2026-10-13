from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_serializer, field_validator

from app.utils.html_sanitize import sanitize_html


def _safe_image_url(url: str | None) -> str | None:
    """Cover images are uploads (/uploads/...) or full https links; nothing else ends up in an <img src>."""
    if not url:
        return None
    url = url.strip()
    if url.startswith("/uploads/") or url.startswith("https://"):
        return url
    raise ValueError("Use an uploaded image or a full https:// link")


class BlogPostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    # Generated from the title when left empty
    slug: str | None = Field(None, max_length=220)
    excerpt: str | None = Field(None, max_length=500)
    content: str | None = None
    cover_image_url: str | None = Field(None, max_length=500)
    cover_image_alt: str | None = Field(None, max_length=300)
    category: str | None = Field(None, max_length=80)
    author_name: str | None = Field(None, max_length=100)
    is_published: bool = False
    is_featured: bool = False
    meta_title: str | None = Field(None, max_length=200)
    meta_description: str | None = Field(None, max_length=500)
    published_at: datetime | None = None

    # The storefront renders post HTML as-is: strip anything that can run script
    _clean_content = field_validator("content")(sanitize_html)
    _clean_cover = field_validator("cover_image_url")(_safe_image_url)


class BlogPostUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, max_length=220)
    excerpt: str | None = Field(None, max_length=500)
    content: str | None = None
    cover_image_url: str | None = Field(None, max_length=500)
    cover_image_alt: str | None = Field(None, max_length=300)
    category: str | None = Field(None, max_length=80)
    author_name: str | None = Field(None, max_length=100)
    is_published: bool | None = None
    is_featured: bool | None = None
    meta_title: str | None = Field(None, max_length=200)
    meta_description: str | None = Field(None, max_length=500)
    published_at: datetime | None = None

    _clean_content = field_validator("content")(sanitize_html)
    _clean_cover = field_validator("cover_image_url")(_safe_image_url)


def _as_utc(value: datetime | None) -> str | None:
    """Dates are stored in UTC without a zone; say so, or browsers read them as local time."""
    if value is None:
        return None
    return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).isoformat()


class _UtcDates(BaseModel):
    @field_serializer("published_at", "updated_at", "created_at", check_fields=False)
    def _dates(self, value: datetime | None) -> str | None:
        return _as_utc(value)


class BlogPostSummary(_UtcDates):
    """A blog card (listing, homepage slider, related posts)."""

    id: int
    title: str
    slug: str
    excerpt: str | None
    cover_image_url: str | None
    cover_image_alt: str | None
    category: str | None
    author_name: str | None
    reading_minutes: int
    is_featured: bool
    published_at: datetime | None

    model_config = {"from_attributes": True}


class BlogPostOut(BlogPostSummary):
    content: str | None
    meta_title: str | None
    meta_description: str | None
    updated_at: datetime | None
    related: list[BlogPostSummary] = []


class BlogPostAdminOut(BlogPostSummary):
    content: str | None
    is_published: bool
    meta_title: str | None
    meta_description: str | None
    created_at: datetime | None
    updated_at: datetime | None


class BlogPostList(BaseModel):
    items: list[BlogPostSummary]
    total: int
    page: int
    pages: int


class BlogCategory(BaseModel):
    name: str
    count: int
