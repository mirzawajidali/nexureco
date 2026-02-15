from pydantic import BaseModel, Field
from datetime import datetime


class PageCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str | None = None
    is_published: bool = False
    meta_title: str | None = Field(None, max_length=200)
    meta_description: str | None = Field(None, max_length=500)


class PageUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    slug: str | None = Field(None, min_length=1, max_length=220)
    content: str | None = None
    is_published: bool | None = None
    meta_title: str | None = None
    meta_description: str | None = None


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
