import json
import logging
from typing import Any
from redis.asyncio import Redis
from app.config import get_settings

logger = logging.getLogger(__name__)

_redis_client: Redis | None = None


async def init_redis() -> Redis | None:
    global _redis_client
    settings = get_settings()
    try:
        _redis_client = Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
        await _redis_client.ping()
        logger.info("Redis connected successfully")
        return _redis_client
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Caching disabled.")
        _redis_client = None
        return None


async def close_redis() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


def get_redis() -> Redis | None:
    return _redis_client


class CacheService:
    # TTL constants (seconds)
    TTL_PRODUCT_LIST = 300       # 5 min
    TTL_PRODUCT_DETAIL = 600     # 10 min
    TTL_SEARCH_RESULTS = 180     # 3 min
    TTL_SUGGESTIONS = 120        # 2 min
    TTL_CATEGORIES = 3600        # 1 hour
    TTL_COLLECTIONS = 1800       # 30 min
    TTL_BANNERS = 1800           # 30 min

    PREFIX = "mybrand"

    @staticmethod
    def _key(*parts: str) -> str:
        return f"{CacheService.PREFIX}:{':'.join(parts)}"

    @staticmethod
    async def get(key: str) -> Any | None:
        client = get_redis()
        if not client:
            return None
        try:
            data = await client.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"Redis GET error for {key}: {e}")
            return None

    @staticmethod
    async def set(key: str, value: Any, ttl: int = 300) -> None:
        client = get_redis()
        if not client:
            return
        try:
            await client.set(key, json.dumps(value, default=str), ex=ttl)
        except Exception as e:
            logger.warning(f"Redis SET error for {key}: {e}")

    @staticmethod
    async def delete(key: str) -> None:
        client = get_redis()
        if not client:
            return
        try:
            await client.delete(key)
        except Exception as e:
            logger.warning(f"Redis DELETE error for {key}: {e}")

    @staticmethod
    async def delete_pattern(pattern: str) -> None:
        client = get_redis()
        if not client:
            return
        try:
            cursor = 0
            while True:
                cursor, keys = await client.scan(cursor, match=pattern, count=100)
                if keys:
                    await client.delete(*keys)
                if cursor == 0:
                    break
        except Exception as e:
            logger.warning(f"Redis DELETE_PATTERN error for {pattern}: {e}")

    # Key builders

    @classmethod
    def product_list_key(cls, **params) -> str:
        sorted_params = sorted(params.items())
        param_str = "&".join(f"{k}={v}" for k, v in sorted_params if v is not None)
        return cls._key("products", "list", param_str)

    @classmethod
    def product_detail_key(cls, slug: str) -> str:
        return cls._key("products", "detail", slug)

    @classmethod
    def search_key(cls, **params) -> str:
        sorted_params = sorted(params.items())
        param_str = "&".join(f"{k}={v}" for k, v in sorted_params if v is not None)
        return cls._key("search", param_str)

    @classmethod
    def suggestions_key(cls, q: str) -> str:
        return cls._key("search", "suggestions", q.lower().strip())

    @classmethod
    def categories_key(cls) -> str:
        return cls._key("categories", "all")

    @classmethod
    def category_key(cls, slug: str) -> str:
        return cls._key("categories", slug)

    @classmethod
    def collections_key(cls, featured_only: bool = False) -> str:
        return cls._key("collections", "featured" if featured_only else "all")

    @classmethod
    def banners_key(cls, position: str | None = None) -> str:
        return cls._key("banners", position or "all")

    # Invalidation helpers

    @classmethod
    async def invalidate_product(cls, slug: str | None = None) -> None:
        await cls.delete_pattern(f"{cls.PREFIX}:products:*")
        await cls.delete_pattern(f"{cls.PREFIX}:search:*")
        if slug:
            await cls.delete(cls.product_detail_key(slug))

    @classmethod
    async def invalidate_categories(cls) -> None:
        await cls.delete_pattern(f"{cls.PREFIX}:categories:*")

    @classmethod
    async def invalidate_collections(cls) -> None:
        await cls.delete_pattern(f"{cls.PREFIX}:collections:*")

    @classmethod
    async def invalidate_banners(cls) -> None:
        await cls.delete_pattern(f"{cls.PREFIX}:banners:*")
