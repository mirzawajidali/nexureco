"""Storefront page HTML: the SPA shell with each URL's head tags and HTTP status.

nginx sends every storefront request that isn't a static file here as /_render/<path>
(frontend/nginx/storefront.conf) and serves the plain index.html if this fails.
"""
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.database import get_db
from app.services.seo_service import build_page_head, render_html
from app.services.sitemap_service import REDIRECTED_PAGE_SLUGS
from app.utils.spa_shell import get_shell

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(include_in_schema=False)

# Every visitor gets the same HTML (account data loads client-side), so edge caches may keep a
# page for a few minutes; browsers always revalidate, so a deploy shows on the next page load.
HTML_CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=60"


# HEAD too: uptime monitors, link checkers and some crawlers probe pages with it
@router.api_route("/_render/{path:path}", methods=["GET", "HEAD"])
async def render_page(path: str, request: Request, db: AsyncSession = Depends(get_db)):
    page_path = "/" + path.strip("/")
    # CMS copies of built-in pages and returns-page aliases redirect (like routes/index.tsx does client-side)
    if page_path.startswith("/page/") and page_path.removeprefix("/page/") in REDIRECTED_PAGE_SLUGS:
        page_path = REDIRECTED_PAGE_SLUGS[page_path.removeprefix("/page/")]
    if path != page_path.lstrip("/"):
        # One URL per page: /product/x/ -> /product/x
        query = f"?{request.url.query}" if request.url.query else ""
        return RedirectResponse(page_path + query, status_code=301)

    base_url = settings.SITE_URL.rstrip("/")
    head = await build_page_head(db, page_path, dict(request.query_params), base_url)
    try:
        shell = await get_shell()
    except RuntimeError:
        logger.exception("Can't render %s", page_path)
        return Response(status_code=503)  # nginx falls back to the static index.html

    return HTMLResponse(
        render_html(shell, head, page_path, base_url),
        status_code=head.status,
        headers={"Cache-Control": HTML_CACHE},
    )
