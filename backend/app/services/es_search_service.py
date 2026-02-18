import logging
from math import ceil
from app.db.elasticsearch import get_es
from app.services.es_index_service import PRODUCTS_INDEX

logger = logging.getLogger(__name__)


async def es_search_products(
    *,
    q: str | None = None,
    page: int = 1,
    page_size: int = 20,
    category_slug: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = "relevance",
    status: str = "active",
    is_featured: bool | None = None,
) -> dict | None:
    """Search products via Elasticsearch. Returns paginated dict or None (fallback)."""
    es = get_es()
    if not es:
        return None

    must_clauses = []
    filter_clauses = []

    if q:
        must_clauses.append({
            "multi_match": {
                "query": q,
                "fields": [
                    "name^5",
                    "name.standard^3",
                    "short_description^2",
                    "description",
                    "tags^2",
                    "sku^3",
                ],
                "type": "best_fields",
                "fuzziness": "AUTO",
                "prefix_length": 1,
                "minimum_should_match": "75%",
            }
        })

    if status:
        filter_clauses.append({"term": {"status": status}})
    if is_featured is not None:
        filter_clauses.append({"term": {"is_featured": is_featured}})
    if category_slug:
        filter_clauses.append({"term": {"category_slug": category_slug}})
    if min_price is not None or max_price is not None:
        price_range = {}
        if min_price is not None:
            price_range["gte"] = min_price
        if max_price is not None:
            price_range["lte"] = max_price
        filter_clauses.append({"range": {"base_price": price_range}})

    bool_query: dict = {}
    if must_clauses:
        bool_query["must"] = must_clauses
    else:
        bool_query["must"] = [{"match_all": {}}]
    if filter_clauses:
        bool_query["filter"] = filter_clauses

    sort_map = {
        "relevance": ["_score", {"created_at": "desc"}],
        "newest": [{"created_at": "desc"}],
        "oldest": [{"created_at": "asc"}],
        "price_asc": [{"base_price": "asc"}],
        "price_desc": [{"base_price": "desc"}],
        "name_asc": [{"name.exact": "asc"}],
        "name_desc": [{"name.exact": "desc"}],
        "popular": [{"total_sold": "desc"}],
        "rating": [{"avg_rating": "desc"}],
    }
    es_sort = sort_map.get(sort, sort_map["relevance"])
    from_offset = (page - 1) * page_size

    try:
        response = await es.search(
            index=PRODUCTS_INDEX,
            body={
                "query": {"bool": bool_query},
                "sort": es_sort,
                "from": from_offset,
                "size": page_size,
                "_source": True,
            },
        )

        total = response["hits"]["total"]["value"]
        items = []
        for hit in response["hits"]["hits"]:
            src = hit["_source"]
            items.append({
                "id": int(hit["_id"]),
                "name": src["name"],
                "slug": src["slug"],
                "short_description": src.get("short_description"),
                "base_price": src["base_price"],
                "compare_at_price": src.get("compare_at_price"),
                "sku": src.get("sku"),
                "status": src["status"],
                "is_featured": src["is_featured"],
                "avg_rating": src.get("avg_rating", 0),
                "review_count": src.get("review_count", 0),
                "total_sold": src.get("total_sold", 0),
                "primary_image": src.get("primary_image"),
                "category_name": src.get("category_name"),
                "total_stock": src.get("total_stock", 0),
                "variant_count": src.get("variant_count", 0),
                "variant_images": src.get("variant_images", []),
                "tags": src.get("tags"),
                "created_at": src.get("created_at"),
            })

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": ceil(total / page_size) if total > 0 else 0,
        }
    except Exception as e:
        logger.error(f"ES search failed: {e}")
        return None


async def es_search_suggestions(q: str, limit: int = 8) -> list[dict] | None:
    """Get autocomplete suggestions from ES. Returns list or None (fallback)."""
    es = get_es()
    if not es:
        return None

    try:
        response = await es.search(
            index=PRODUCTS_INDEX,
            body={
                "query": {
                    "bool": {
                        "must": [{
                            "multi_match": {
                                "query": q,
                                "fields": ["name^3", "name.standard"],
                                "type": "best_fields",
                                "fuzziness": "AUTO",
                                "prefix_length": 1,
                            }
                        }],
                        "filter": [{"term": {"status": "active"}}],
                    }
                },
                "sort": ["_score", {"total_sold": "desc"}],
                "size": limit,
                "_source": ["name", "slug", "primary_image"],
            },
        )
        return [
            {"name": hit["_source"]["name"], "slug": hit["_source"]["slug"], "image": hit["_source"].get("primary_image")}
            for hit in response["hits"]["hits"]
        ]
    except Exception as e:
        logger.error(f"ES suggestions failed: {e}")
        return None


async def es_admin_search_products(q: str, limit: int = 5) -> tuple[list[dict], int] | None:
    """Admin product search. Returns (results, total_count) or None (fallback)."""
    es = get_es()
    if not es:
        return None

    try:
        response = await es.search(
            index=PRODUCTS_INDEX,
            body={
                "query": {
                    "multi_match": {
                        "query": q,
                        "fields": ["name^3", "sku^2", "name.standard"],
                        "type": "best_fields",
                        "fuzziness": "AUTO",
                        "prefix_length": 1,
                    }
                },
                "sort": ["_score", {"created_at": "desc"}],
                "size": limit,
                "_source": ["name", "slug", "base_price", "status", "primary_image", "variant_count"],
            },
        )
        total = response["hits"]["total"]["value"]
        products = [
            {
                "id": int(hit["_id"]),
                "name": hit["_source"]["name"],
                "slug": hit["_source"]["slug"],
                "base_price": hit["_source"]["base_price"],
                "status": hit["_source"]["status"],
                "image_url": hit["_source"].get("primary_image"),
                "variant_count": hit["_source"].get("variant_count", 0),
            }
            for hit in response["hits"]["hits"]
        ]
        return products, total
    except Exception as e:
        logger.error(f"ES admin search failed: {e}")
        return None
