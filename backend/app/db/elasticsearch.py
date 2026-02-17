import logging
from elasticsearch import AsyncElasticsearch
from app.config import get_settings

logger = logging.getLogger(__name__)

_es_client: AsyncElasticsearch | None = None


async def init_elasticsearch() -> AsyncElasticsearch | None:
    global _es_client
    settings = get_settings()
    try:
        _es_client = AsyncElasticsearch(
            settings.ELASTICSEARCH_URL,
            request_timeout=10,
            max_retries=3,
            retry_on_timeout=True,
        )
        info = await _es_client.info()
        logger.info(f"Elasticsearch connected: {info['version']['number']}")
        return _es_client
    except Exception as e:
        logger.warning(f"Elasticsearch connection failed: {e}. Search will use MySQL fallback.")
        _es_client = None
        return None


async def close_elasticsearch() -> None:
    global _es_client
    if _es_client:
        await _es_client.close()
        _es_client = None


def get_es() -> AsyncElasticsearch | None:
    return _es_client
