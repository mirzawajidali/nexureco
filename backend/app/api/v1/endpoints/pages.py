from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.exceptions import NotFoundException
from app.models.page import Page
from app.schemas.page import PageOut

router = APIRouter(prefix="/pages", tags=["Pages"])


@router.get("/", response_model=list[PageOut])
async def list_published_pages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Page)
        .where(Page.is_published == True)
        .order_by(Page.title.asc())
    )
    return result.scalars().all()


@router.get("/{slug}", response_model=PageOut)
async def get_page_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Page).where(Page.slug == slug, Page.is_published == True)
    )
    page = result.scalar_one_or_none()
    if not page:
        raise NotFoundException("Page not found")
    return page
