from pydantic import BaseModel, Field


class ChatHistoryItem(BaseModel):
    role: str = Field(..., pattern="^(user|model)$")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: list[ChatHistoryItem] = []


class ChatResponse(BaseModel):
    reply: str
