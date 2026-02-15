from datetime import datetime
from pydantic import BaseModel, EmailStr


class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    order_number: str | None = None
    subject: str
    message: str


class ContactReply(BaseModel):
    reply: str


class ContactOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    order_number: str | None
    subject: str
    message: str
    status: str
    admin_reply: str | None
    replied_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True
