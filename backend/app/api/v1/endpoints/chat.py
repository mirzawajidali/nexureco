from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services import chat_service

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse)
async def send_message(data: ChatRequest):
    """Public chatbot endpoint — sends message to Gemini AI with conversation history."""
    reply = await chat_service.chat(
        message=data.message,
        history=[item.model_dump() for item in data.history],
    )
    return ChatResponse(reply=reply)
