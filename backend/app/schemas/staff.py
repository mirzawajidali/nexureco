from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class StaffCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str | None = None
    role_id: int


class StaffUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    role_id: int | None = None
    is_active: bool | None = None


class StaffOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: str | None
    role: str
    role_id: int | None
    role_name: str | None = None
    permissions: list[str] = []
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None

    model_config = {"from_attributes": True}
