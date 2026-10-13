from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from app.utils.html_sanitize import sanitize_html


class PageCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str | None = None
    is_published: bool = False
    meta_title: str | None = Field(None, max_length=200)
    meta_description: str | None = Field(None, max_length=500)

    # The storefront renders page HTML as-is: strip anything that can run script
    _clean_content = field_validator("content")(sanitize_html)


class PageUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=220)
    content: str | None = None
    is_published: bool | None = None
    meta_title: str | None = None
    meta_description: str | None = None

    _clean_content = field_validator("content")(sanitize_html)


class PageOut(BaseModel):
    id: int
    title: str
    slug: str
    content: str | None
    is_published: bool
    meta_title: str | None
    meta_description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
