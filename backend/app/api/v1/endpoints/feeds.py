"""Machine-readable store data for shopping surfaces and AI assistants.

/feeds/products.xml  Google Merchant Center product feed (RSS 2.0); Meta Commerce Manager accepts it too
/llms.txt            plain-language store overview for AI assistants (https://llmstxt.org)

Item ids are product ids, matching the content_ids the Meta/TikTok pixels and GA4 send.
"""
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.store import (
    CURRENCY,
    FREE_SHIPPING_THRESHOLD,
    SITE_NAME,
    STANDARD_SHIPPING_COST,
    STORE_EMAIL,
    STORE_HOURS,
    STORE_PHONE,
    format_price,
)
from app.db.database import get_db
from app.models.page import Page
from app.services import blog_service
from app.services.listing_service import get_listings_with_products
from app.services.seo_service import (
    HOME_DESCRIPTION,
    active_products,
    html_to_text,
    in_stock,
    sorted_images,
    truncate_text,
)
from app.utils.image_variants import jpeg_url

router = APIRouter(tags=["SEO"])
settings = get_settings()

FEED_CACHE = "public, max-age=3600"


def _money(amount: float) -> str:
    return f"{amount:.2f} {CURRENCY}"


@router.api_route("/feeds/products.xml", methods=["GET", "HEAD"], response_class=Response)
async def product_feed(db: AsyncSession = Depends(get_db)):
    """All active products, one item each, in Google Merchant Center's RSS format."""
    base_url = settings.SITE_URL.rstrip("/")
    items = []
    for product in await active_products(db):
        images = [_absolute_jpeg(base_url, img.url) for img in sorted_images(product)]
        images = [url for url in images if url]
        if not images:
            continue  # both Google and Meta reject items without an image

        price = float(product.base_price)
        compare_at = float(product.compare_at_price) if product.compare_at_price else None
        on_sale = compare_at is not None and compare_at > price
        description = (
            product.short_description or html_to_text(product.description or "") or product.name
        )
        shipping = 0 if price >= FREE_SHIPPING_THRESHOLD else STANDARD_SHIPPING_COST
        fields = [
            ("g:id", str(product.id)),
            ("g:title", truncate_text(product.name, 150)),
            ("g:description", truncate_text(description, 5000)),
            ("g:link", f"{base_url}/product/{product.slug}"),
            ("g:image_link", images[0]),
            *[("g:additional_image_link", url) for url in images[1:11]],
            ("g:availability", "in_stock" if in_stock(product) else "out_of_stock"),
            ("g:price", _money(compare_at if on_sale else price)),
            *([("g:sale_price", _money(price))] if on_sale else []),
            ("g:brand", SITE_NAME),
            ("g:condition", "new"),
            ("g:identifier_exists", "no"),
            *([("g:product_type", product.category.name)] if product.category else []),
        ]
        body = "".join(f"\n      <{tag}>{escape(value)}</{tag}>" for tag, value in fields)
        body += (
            f"\n      <g:shipping><g:country>PK</g:country>"
            f"<g:price>{escape(_money(shipping))}</g:price></g:shipping>"
        )
        items.append(f"    <item>{body}\n    </item>")

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n'
        "  <channel>\n"
        f"    <title>{escape(SITE_NAME)}</title>\n"
        f"    <link>{escape(base_url)}/</link>\n"
        f"    <description>{escape(HOME_DESCRIPTION)}</description>\n"
        + "\n".join(items)
        + "\n  </channel>\n</rss>\n"
    )
    return Response(content=xml, media_type="application/xml", headers={"Cache-Control": FEED_CACHE})


def _absolute_jpeg(base_url: str, url: str) -> str | None:
    """Neither feed reader accepts AVIF, so uploads are linked through their JPEG copy."""
    feed_url = jpeg_url(url, "feed")
    return f"{base_url}{feed_url}" if feed_url else None


@router.api_route("/llms.txt", methods=["GET", "HEAD"], response_class=Response)
async def llms_txt(db: AsyncSession = Depends(get_db)):
    base_url = settings.SITE_URL.rstrip("/")
    products = await active_products(db)
    category_slugs, collection_slugs = await get_listings_with_products(db)
    pages = (await db.execute(
        select(Page.title, Page.slug).where(Page.is_published == True).order_by(Page.title)
    )).all()

    categories = {
        p.category.slug: p.category.name for p in products if p.category and p.category.slug in category_slugs
    }
    lines = [
        f"# {SITE_NAME}",
        "",
        f"> {HOME_DESCRIPTION}",
        "",
        "Online clothing store in Pakistan. Prices are in Pakistani rupees (PKR). Payment is cash on delivery. "
        f"Shipping is {format_price(STANDARD_SHIPPING_COST)} nationwide, free on orders of "
        f"{format_price(FREE_SHIPPING_THRESHOLD)} or more.",
        f"Customer support: {STORE_PHONE}, {STORE_EMAIL} ({STORE_HOURS}).",
        "",
        "## Products",
        "",
    ]
    for product in products:
        price = float(product.base_price)
        compare_at = float(product.compare_at_price) if product.compare_at_price else None
        was = f" (was {format_price(compare_at)})" if compare_at and compare_at > price else ""
        stock = "in stock" if in_stock(product) else "out of stock"
        sizes = next((o for o in product.options if o.name.lower() == "size"), None)
        size_text = f", sizes {', '.join(v.value for v in sorted(sizes.values, key=lambda v: v.display_order))}" if sizes and sizes.values else ""
        summary = product.short_description or html_to_text(product.description or "")
        lines.append(
            f"- [{product.name}]({base_url}/product/{product.slug}): {format_price(price)}{was}, {stock}{size_text}."
            + (f" {truncate_text(summary, 200)}" if summary else "")
        )

    if categories or collection_slugs:
        lines += ["", "## Shop", ""]
        lines += [f"- [{name}]({base_url}/category/{slug})" for slug, name in sorted(categories.items())]
        lines += [f"- [{slug.replace('-', ' ').title()}]({base_url}/collections/{slug})" for slug in sorted(collection_slugs)]

    # Blog articles: style, fit, care and shopping guides
    posts = await blog_service.all_live(db)
    if posts:
        lines += ["", "## Guides", ""]
        lines += [
            f"- [{p.title}]({base_url}/blog/{p.slug})" + (f": {p.excerpt}" if p.excerpt else "")
            for p in posts
        ]

    lines += [
        "",
        "## Store information",
        "",
        f"- [About us]({base_url}/about)",
        f"- [Contact]({base_url}/contact)",
        f"- [Size guide]({base_url}/size-guide)",
        *[f"- [{p.title}]({base_url}/page/{p.slug})" for p in pages],
        "",
        "## Optional",
        "",
        f"- [Product feed (XML)]({base_url}/feeds/products.xml)",
        f"- [Sitemap]({base_url}/sitemap.xml)",
        "",
    ]
    return Response(content="\n".join(lines), media_type="text/plain; charset=utf-8", headers={"Cache-Control": FEED_CACHE})
