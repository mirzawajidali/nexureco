from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.contact import ContactCreate
from app.schemas.common import MessageResponse
from app.services import contact_service

router = APIRouter(prefix="/contact", tags=["Contact"])


@router.post("/", response_model=MessageResponse, status_code=201)
async def submit_contact(
    data: ContactCreate,
    db: AsyncSession = Depends(get_db),
):
    return await contact_service.create_message(db, data)
