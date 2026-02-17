from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.db.database import get_db
from app.core.dependencies import require_module
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.media import MediaFile
from app.models.product import Product, ProductImage
from app.utils.file_upload import save_upload_file_with_meta, delete_upload_file
from app.utils.pagination import paginate
from app.schemas.common import MessageResponse

router = APIRouter(prefix="/admin/media", tags=["Admin Media"])


@router.get("/")
async def list_media(
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    q: str | None = None,
    admin: User = require_module("media"),
    db: AsyncSession = Depends(get_db),
):
    query = select(MediaFile).order_by(MediaFile.created_at.desc())

    if q:
        search_term = f"%{q}%"
        query = query.where(
            or_(
                MediaFile.original_filename.ilike(search_term),
                MediaFile.alt_text.ilike(search_term),
            )
        )

    result = await paginate(db, query, page, page_size)

    # Batch-load all linked products in one query (instead of N separate queries)
    media_files = result["items"]
    urls = [mf.url for mf in media_files]
    link_map: dict[str, list[dict]] = {url: [] for url in urls}
    if urls:
        linked = await db.execute(
            select(ProductImage.url, Product.id, Product.name)
            .join(Product, ProductImage.product_id == Product.id)
            .where(ProductImage.url.in_(urls))
            .distinct()
        )
        for row in linked.all():
            if row.url in link_map:
                link_map[row.url].append({"id": row.id, "name": row.name})

    items_out = []
    for mf in media_files:
        items_out.append({
            "id": mf.id,
            "url": mf.url,
            "original_filename": mf.original_filename,
            "file_size": mf.file_size,
            "content_type": mf.content_type,
            "width": mf.width,
            "height": mf.height,
            "alt_text": mf.alt_text,
            "created_at": mf.created_at,
            "linked_products": link_map.get(mf.url, []),
        })

    result["items"] = items_out
    return result


@router.post("/upload", status_code=201)
async def upload_media(
    file: UploadFile = File(...),
    alt_text: str | None = None,
    admin: User = require_module("media"),
    db: AsyncSession = Depends(get_db),
):
    meta = await save_upload_file_with_meta(file, subfolder="media")
    media_file = MediaFile(
        url=meta["url"],
        original_filename=meta["original_filename"],
        file_size=meta["file_size"],
        content_type=meta["content_type"],
        width=meta["width"],
        height=meta["height"],
        alt_text=alt_text,
    )
    db.add(media_file)
    await db.flush()
    await db.refresh(media_file)
    return {
        "id": media_file.id,
        "url": media_file.url,
        "original_filename": media_file.original_filename,
        "file_size": media_file.file_size,
        "content_type": media_file.content_type,
        "width": media_file.width,
        "height": media_file.height,
        "alt_text": media_file.alt_text,
        "created_at": media_file.created_at,
        "linked_products": [],
    }


@router.get("/{media_id}")
async def get_media_detail(
    media_id: int,
    admin: User = require_module("media"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MediaFile).where(MediaFile.id == media_id)
    )
    mf = result.scalar_one_or_none()
    if not mf:
        raise NotFoundException("Media file not found")

    # Find linked products
    linked = await db.execute(
        select(Product.id, Product.name)
        .join(ProductImage, ProductImage.product_id == Product.id)
        .where(ProductImage.url == mf.url)
        .distinct()
    )
    products = [{"id": r.id, "name": r.name} for r in linked.all()]

    return {
        "id": mf.id,
        "url": mf.url,
        "original_filename": mf.original_filename,
        "file_size": mf.file_size,
        "content_type": mf.content_type,
        "width": mf.width,
        "height": mf.height,
        "alt_text": mf.alt_text,
        "created_at": mf.created_at,
        "linked_products": products,
    }


@router.put("/{media_id}")
async def update_media(
    media_id: int,
    alt_text: str | None = None,
    admin: User = require_module("media"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MediaFile).where(MediaFile.id == media_id)
    )
    mf = result.scalar_one_or_none()
    if not mf:
        raise NotFoundException("Media file not found")

    if alt_text is not None:
        mf.alt_text = alt_text
    await db.flush()
    await db.refresh(mf)
    return {"id": mf.id, "alt_text": mf.alt_text}


@router.delete("/{media_id}", response_model=MessageResponse)
async def delete_media(
    media_id: int,
    admin: User = require_module("media"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MediaFile).where(MediaFile.id == media_id)
    )
    mf = result.scalar_one_or_none()
    if not mf:
        raise NotFoundException("Media file not found")

    delete_upload_file(mf.url)
    await db.delete(mf)
    await db.flush()
    return {"message": "File deleted successfully"}
