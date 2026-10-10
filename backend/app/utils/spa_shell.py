"""The storefront's built index.html ("shell"), fetched from the frontend container.

Every deploy can change the hashed asset URLs inside it, so the cached copy is revalidated
with If-None-Match on every use — a ~1 ms 304 on the internal network.
"""
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client = httpx.AsyncClient(timeout=3.0)
_cached_html: str | None = None
_cached_etag: str | None = None


async def get_shell() -> str:
    """Return the current index.html, or the last good copy if the frontend can't be reached.

    Raises RuntimeError when no copy has ever been fetched.
    """
    global _cached_html, _cached_etag

    headers = {"If-None-Match": _cached_etag} if _cached_html and _cached_etag else {}
    try:
        res = await _client.get(settings.SPA_SHELL_URL, headers=headers)
        if res.status_code == 304 and _cached_html:
            return _cached_html
        res.raise_for_status()
        _cached_html, _cached_etag = res.text, res.headers.get("etag")
        return _cached_html
    except httpx.HTTPError as exc:
        if _cached_html:
            logger.warning("SPA shell refresh failed, serving cached copy: %s", exc)
            return _cached_html
        raise RuntimeError(f"SPA shell unavailable: {exc}") from exc
