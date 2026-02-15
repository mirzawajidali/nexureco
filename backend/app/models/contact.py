from sqlalchemy import Column, Integer, String, Text, Enum, DateTime
from sqlalchemy.sql import func

from app.db.database import Base


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    order_number = Column(String(50), nullable=True)
    subject = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(
        Enum("new", "read", "replied", "archived", name="contact_status"),
        default="new",
        index=True,
    )
    admin_reply = Column(Text, nullable=True)
    replied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
