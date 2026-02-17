import logging
from elasticsearch import NotFoundError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.elasticsearch import get_es
from app.models.product import Product, ProductVariant
from app.services.es_index_service import PRODUCTS_INDEX, PRODUCTS_SETTINGS

logger = logging.getLogger(__name__)


def _product_to_es_doc(product: Product) -> dict:
    primary_img = None
    for img in (product.images or []):
        if img.is_primary:
            primary_img = img.url
            break
    if not primary_img and product.images:
        primary_img = product.images[0].url

    total_stock = sum(v.stock_quantity for v in (product.variants or []))
    variant_count = len(product.variants or [])
    variant_images = list(dict.fromkeys(
        v.image_url for v in (product.variants or []) if v.image_url
    ))

    return {
        "name": product.name,
        "slug": product.slug,
        "description": product.description or "",
        "short_description": product.short_description or "",
        "sku": product.sku or "",
        "tags": product.tags or [],
        "status": product.status,
        "category_id": product.category_id,
        "category_name": product.category.name if product.category else None,
        "category_slug": product.category.slug if product.category else None,
        "base_price": float(product.base_price),
        "compare_at_price": float(product.compare_at_price) if product.compare_at_price else None,
        "is_featured": product.is_featured,
        "total_sold": product.total_sold,
        "avg_rating": float(product.avg_rating),
        "review_count": product.review_count,
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "primary_image": primary_img,
        "variant_count": variant_count,
        "total_stock": total_stock,
        "variant_images": variant_images,
    }


async def index_product(product: Product) -> None:
    es = get_es()
    if not es:
        return
    try:
        doc = _product_to_es_doc(product)
        await es.index(index=PRODUCTS_INDEX, id=str(product.id), document=doc)
        logger.debug(f"Indexed product {product.id} in ES")
    except Exception as e:
        logger.error(f"Failed to index product {product.id}: {e}")


async def delete_product_from_index(product_id: int) -> None:
    es = get_es()
    if not es:
        return
    try:
        await es.delete(index=PRODUCTS_INDEX, id=str(product_id))
        logger.debug(f"Deleted product {product_id} from ES index")
    except NotFoundError:
        pass
    except Exception as e:
        logger.error(f"Failed to delete product {product_id} from ES: {e}")


async def bulk_index_all_products(db: AsyncSession) -> int:
    es = get_es()
    if not es:
        return 0

    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.images),
            selectinload(Product.variants),
            selectinload(Product.category),
        )
    )
    products = result.scalars().all()

    if not products:
        logger.info("No products to index")
        return 0

    operations = []
    for product in products:
        operations.append({"index": {"_index": PRODUCTS_INDEX, "_id": str(product.id)}})
        operations.append(_product_to_es_doc(product))

    try:
        resp = await es.bulk(operations=operations, refresh=True)
        indexed = sum(1 for item in resp["items"] if item["index"]["status"] in (200, 201))
        errors = sum(1 for item in resp["items"] if item["index"]["status"] not in (200, 201))
        logger.info(f"Bulk indexed {indexed} products ({errors} errors)")
        return indexed
    except Exception as e:
        logger.error(f"Bulk indexing failed: {e}")
        return 0
