from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.config import get_settings
from app.services.sitemap_service import get_sitemap_entries

router = APIRouter(tags=["SEO"])
settings = get_settings()


def _format_date(dt) -> str:
    """Format datetime to W3C date string for sitemap."""
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d")


def _build_url_entry(loc: str, lastmod=None, changefreq: str = "weekly", priority: str = "0.5") -> str:
    parts = [f"  <url>\n    <loc>{loc}</loc>"]
    if lastmod:
        parts.append(f"    <lastmod>{_format_date(lastmod)}</lastmod>")
    parts.append(f"    <changefreq>{changefreq}</changefreq>")
    parts.append(f"    <priority>{priority}</priority>")
    parts.append("  </url>")
    return "\n".join(parts)


@router.get("/sitemap.xml", response_class=Response)
async def sitemap_xml(db: AsyncSession = Depends(get_db)):
    """Generate dynamic XML sitemap with all public URLs."""
    base_url = settings.SITE_URL.rstrip("/")
    entries = await get_sitemap_entries(db)

    urls = []

    # Static pages
    urls.append(_build_url_entry(f"{base_url}/", changefreq="daily", priority="1.0"))
    urls.append(_build_url_entry(f"{base_url}/search", changefreq="daily", priority="0.6"))
    urls.append(_build_url_entry(f"{base_url}/contact", changefreq="monthly", priority="0.4"))
    urls.append(_build_url_entry(f"{base_url}/size-guide", changefreq="monthly", priority="0.3"))

    # Categories
    for cat in entries["categories"]:
        urls.append(_build_url_entry(
            f"{base_url}/category/{cat['slug']}",
            lastmod=cat["updated_at"],
            changefreq="weekly",
            priority="0.8",
        ))

    # Collections
    for col in entries["collections"]:
        urls.append(_build_url_entry(
            f"{base_url}/collections/{col['slug']}",
            lastmod=col["updated_at"],
            changefreq="weekly",
            priority="0.7",
        ))

    # Products
    for prod in entries["products"]:
        urls.append(_build_url_entry(
            f"{base_url}/product/{prod['slug']}",
            lastmod=prod["updated_at"],
            changefreq="weekly",
            priority="0.8",
        ))

    # CMS Pages
    for page in entries["pages"]:
        urls.append(_build_url_entry(
            f"{base_url}/page/{page['slug']}",
            lastmod=page["updated_at"],
            changefreq="monthly",
            priority="0.5",
        ))

    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml_content += "\n".join(urls)
    xml_content += "\n</urlset>\n"

    return Response(content=xml_content, media_type="application/xml")


@router.get("/robots.txt", response_class=Response)
async def robots_txt():
    """Serve robots.txt with sitemap reference."""
    base_url = settings.SITE_URL.rstrip("/")
    content = (
        "User-agent: *\n"
        "Allow: /\n"
        "\n"
        "# Disallow private/admin areas\n"
        "Disallow: /account/\n"
        "Disallow: /checkout\n"
        "Disallow: /cart\n"
        "Disallow: /admin/\n"
        "Disallow: /api/\n"
        "\n"
        f"Sitemap: {base_url}/sitemap.xml\n"
    )
    return Response(content=content, media_type="text/plain")
