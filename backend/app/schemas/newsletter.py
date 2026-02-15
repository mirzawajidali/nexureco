from pydantic import BaseModel, EmailStr


class NewsletterSubscribe(BaseModel):
    email: EmailStr


class NewsletterUnsubscribe(BaseModel):
    email: EmailStr
