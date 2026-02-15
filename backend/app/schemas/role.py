from pydantic import BaseModel, Field
from datetime import datetime


class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    permissions: list[str] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: list[str] | None = None
    is_active: bool | None = None


class RoleOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    permissions: list[str]
    is_active: bool
    staff_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
