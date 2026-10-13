"""Per-URL <head> tags, HTTP status and a no-JavaScript content fallback for storefront pages.

nginx hands every storefront page request to app/api/storefront.py, which renders the result of
build_page_head() into the built index.html. Crawlers that don't run JavaScript (WhatsApp, Facebook
and Instagram link previews, AI assistants, shopping surfaces) then get each URL's real title,
description, canonical, Open Graph tags, structured data and status (404 for unknown URLs)
instead of the bare SPA shell.

Once the app loads, react-helmet takes over every tag marked data-rh="true", so the title,
description, canonical and robots rules here mirror the storefront — keep them in sync:
  frontend/src/components/layout/Layout.tsx   site-wide defaults and canonical
  frontend/src/pages/storefront/*Page.tsx      per-page <title>, description and robots
  frontend/src/utils/seo.ts                    product JSON-LD and htmlToText()
"""
import html
import json
import re
from dataclasses import dataclass, field
from datetime import timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.store import (
    CURRENCY,
    DEFAULT_DESCRIPTION,
    FREE_SHIPPING_THRESHOLD,
    SITE_NAME,
    SOCIAL_PROFILES,
    STORE_ADDRESS,
    STORE_EMAIL,
    STORE_HOURS,
    STORE_PHONE,
    TAGLINE,
    TITLE_SUFFIX,
    format_price,
)
from app.services.store_settings_service import free_shipping_phrase, get_store_settings
from app.models.banner import Banner
from app.models.blog import BlogPost
from app.models.category import Category
from app.models.collection import Collection, CollectionProduct
from app.models.page import Page
from app.models.product import Product
from app.services import blog_service
from app.services.listing_service import get_listings_with_products
from app.services.product_service import _product_eager_options
from app.utils.image_variants import JPEG_PRESETS, jpeg_url

# SEO copy (Adidas-style): titles "[keywords] | Nexure CO Pakistan" under 60 chars, descriptions 140-160 chars
# starting with a verb. Same text as frontend/src/utils/constants.ts (HOME_*, PAGE_SEO) — keep them identical.
HOME_TITLE = "Men's T-Shirts and Oversized Tees"
HOME_H1 = "Men's T-Shirts and Oversized Tees in Pakistan"
def home_description(free_from: int) -> str:
    """The homepage description, with the free-shipping amount set in Admin > Settings (0 = every order ships free)."""
    shipping = f"free shipping from {format_price(free_from)}" if free_from > 0 else "free shipping on all orders"
    return (
        "Explore men's T-shirts at Nexure CO: oversized, regular fit and embroidered tees in 100% cotton. "
        f"Cash on delivery across Pakistan, {shipping}."
    )


HOME_DESCRIPTION = home_description(FREE_SHIPPING_THRESHOLD)
ABOUT_DESCRIPTION = (
    "Discover Nexure CO, a Lahore T-shirt brand making premium 100% cotton tees in oversized, regular fit and "
    "embroidered styles, delivered across Pakistan."
)
CONTACT_DESCRIPTION = (
    f"Contact {SITE_NAME} for help with orders, delivery, returns and sizing. "
    f"Call {STORE_PHONE} or email {STORE_EMAIL}, {STORE_HOURS}."
)
SIZE_GUIDE_DESCRIPTION = (
    "Find your T-shirt size with the Nexure CO size guide: chest and length charts for regular fit and oversized "
    "tees, plus easy tips for measuring at home."
)
BLOG_TITLE = "Men's Style, Fit and T-Shirt Care Blog"
BLOG_DESCRIPTION = (
    "Read the Nexure CO blog for men's T-shirt styling ideas, size and fit advice, and cotton care tips "
    "made for Pakistan's weather and wardrobes."
)
DEFAULT_IMAGE = "/static/images/logo.png"
LISTING_LIMIT = 48  # products listed in a category/collection's no-JS fallback

# Indexable pages with fixed content: path -> (title, description)
_STATIC_PAGES: dict[str, tuple[str | None, str]] = {
    "/": (None, HOME_DESCRIPTION),
    "/about": ("About Us and Our Story", ABOUT_DESCRIPTION),
    "/contact": ("Contact Us and Customer Support", CONTACT_DESCRIPTION),
    "/size-guide": ("T-Shirt Size Guide and Fit Chart", SIZE_GUIDE_DESCRIPTION),
}

# Account, cart and checkout pages: path -> title. Rendered, but never indexed.
_PRIVATE_PAGES: dict[str, str] = {
    "/cart": "Shopping Bag",
    "/wishlist": "Wishlist",
    "/checkout": "Checkout",
    "/login": "Sign In",
    "/register": "Create Account",
    "/forgot-password": "Forgot Password",
    "/track-order": "Track Your Order",
    "/order/confirm": "Confirm Your Order",
}
# Private pages under a path prefix: (prefix, title); the prefix itself matches too ("/account")
_PRIVATE_PREFIXES: list[tuple[str, str]] = [
    ("/account", "My Account"),
    ("/track-order", "Track Your Order"),
    ("/order-confirmation", "Order Confirmed"),
    ("/admin", "Admin"),
    ("/bag", "Your Bag"),
]

_DETAIL_PATH = re.compile(r"^/(category|collections|product|page)/([^/]+)$")
_BLOG_POST_PATH = re.compile(r"^/blog/([^/]+)$")
_BLOCK_TAG = re.compile(r"</?(p|div|br|li|ul|ol|h[1-6]|tr|td|th|blockquote)\b[^>]*>", re.I)
_UNSAFE_BLOCK = re.compile(r"<(script|style|iframe|noscript)\b.*?</\1\s*>", re.I | re.S)


@dataclass
class PageHead:
    title: str  # the full <title>, brand included
    description: str = DEFAULT_DESCRIPTION
    status: int = 200
    robots: str | None = None
    og_title: str | None = None  # defaults to the title without the brand suffix
    og_type: str = "website"
    image: str | None = None  # share image: /uploads/... or site path
    image_size: tuple[int, int] | None = None
    image_alt: str | None = None
    product_tags: dict[str, str] = field(default_factory=dict)  # product:* / article:* Open Graph tags
    # JSON-LD the client renders too (replaced on hydration) / only rendered here (kept)
    json_ld: list[dict] = field(default_factory=list)
    static_json_ld: list[dict] = field(default_factory=list)
    noscript: str = ""  # HTML shown to crawlers that don't run JavaScript


# ── Text helpers (mirror frontend/src/utils) ─────────────────────────────────


def html_to_text(markup: str) -> str:
    """Plain text from rich-text HTML; same as htmlToText() in frontend/src/utils/seo.ts."""
    markup = re.sub(r"<!--.*?-->", "", markup, flags=re.S)
    # Pad block-level tags with spaces so "<h3>Title</h3><p>Text" doesn't become "TitleText"
    text = re.sub(r"<[^>]*>", "", _BLOCK_TAG.sub(r" \g<0> ", markup))
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


_BRAND_PREFIX = re.compile(r"^(nexure\s?co|nexureco)\s+", re.I)


def short_product_name(name: str) -> str:
    """The product name without the leading brand (the title already ends with it). Same as shortProductName()."""
    return _BRAND_PREFIX.sub("", name).strip() or name


_MATERIAL = re.compile(r"\s*\b\d+%\s+[A-Za-z]+(?:\s+jersey)?\b", re.I)


def product_title(name: str) -> str:
    """Title keywords for a product without a meta title: the name without the brand, and without the material
    ("100% Cotton Jersey") when the full title would pass 60 characters. Same as productTitle() in utils/seo.ts."""
    short = short_product_name(name)
    if len(f"{short} | {TITLE_SUFFIX}") > 60:
        short = _MATERIAL.sub("", short).strip() or short
    return short


def _first_paragraph(text: str) -> str:
    return re.split(r"\n\s*\n", text.strip(), maxsplit=1)[0]


def _breadcrumbs(base_url: str, trail: list[tuple[str, str]]) -> dict:
    """BreadcrumbList JSON-LD: Home, then each (name, path). Same as breadcrumbStructuredData() in utils/seo.ts."""
    items = [("Home", "/"), *trail]
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": f"{base_url}{path}"}
            for i, (name, path) in enumerate(items)
        ],
    }


def truncate_text(text: str, max_length: int) -> str:
    """Same as truncateText() in frontend/src/utils/formatters.ts."""
    if len(text) <= max_length:
        return text
    return text[:max_length].strip() + "..."


def in_stock(product: Product) -> bool:
    """Stock rule of productStructuredData(): any active variant in stock (no variants = in stock)."""
    variants = [v for v in product.variants if v.is_active]
    return any(v.stock_quantity > 0 for v in variants) if variants else True


def sorted_images(product: Product) -> list:
    """Primary image first, then display order."""
    return sorted(product.images, key=lambda img: (not img.is_primary, img.display_order))


async def active_products(db: AsyncSession) -> list[Product]:
    """Every active product with images, options, variants and category loaded, newest first."""
    return list((await db.execute(
        select(Product)
        .options(*_product_eager_options())
        .where(Product.status == "active")
        .order_by(Product.created_at.desc())
    )).scalars())


def _branded(title: str | None) -> str:
    """Layout.tsx's titleTemplate / defaultTitle."""
    return f"{title} | {TITLE_SUFFIX}" if title else f"{HOME_TITLE} | {TITLE_SUFFIX}"


def _e(value: str) -> str:
    return html.escape(value, quote=True)


def _absolute(base_url: str, url: str) -> str:
    return url if re.match(r"^https?://", url) else f"{base_url}{url}"


def _social_image(url: str | None) -> tuple[str | None, tuple[int, int] | None]:
    """The 1200x630 JPEG card for an uploaded image (or the image itself if it isn't an upload)."""
    card = jpeg_url(url, "social")
    if card:
        width, height, _ = JPEG_PRESETS["social"]
        return card, (width, height)
    return url, None


def _product_list(products, base_url: str) -> str:
    items = "".join(
        f'<li><a href="{_e(base_url)}/product/{_e(p.slug)}">{_e(p.name)}</a> – {_e(format_price(float(p.base_price)))}</li>'
        for p in products
    )
    return f"<ul>{items}</ul>" if items else ""


# ── Page resolution ──────────────────────────────────────────────────────────


async def build_page_head(db: AsyncSession, path: str, query: dict[str, str], base_url: str) -> PageHead:
    """Resolve a storefront path (no trailing slash) to its head tags and status.

    The route table mirrors frontend/src/routes/index.tsx; anything else is a 404.
    """
    if path in _STATIC_PAGES:
        title, description = _STATIC_PAGES[path]
        if path == "/":
            return await _home_head(db, base_url)
        head = PageHead(title=_branded(title), description=description)
        head.noscript = f"<h1>{_e(title)}</h1><p>{_e(description)}</p>"
        if path == "/contact":
            head.noscript += (
                f"<p>Phone: {_e(STORE_PHONE)}<br>Email: {_e(STORE_EMAIL)}<br>"
                f"Address: {_e(STORE_ADDRESS)}<br>Hours: {_e(STORE_HOURS)}</p>"
            )
        return head

    if path == "/search":
        return PageHead(title=_branded(f"Search: {query.get('q', '')}"), robots="noindex")
    if path in _PRIVATE_PAGES:
        return PageHead(title=_branded(_PRIVATE_PAGES[path]), robots="noindex")
    for prefix, title in _PRIVATE_PREFIXES:
        if path == prefix or path.startswith(prefix + "/"):
            return PageHead(title=_branded(title), robots="noindex")

    if path == "/blog":
        return await _blog_index_head(db, base_url)
    blog_match = _BLOG_POST_PATH.match(path)
    if blog_match:
        return await _blog_post_head(db, blog_match.group(1), base_url) or not_found_head(base_url, "Post Not Found")

    match = _DETAIL_PATH.match(path)
    if match:
        kind, slug = match.groups()
        builder = {
            "product": _product_head,
            "category": _category_head,
            "collections": _collection_head,
            "page": _content_page_head,
        }[kind]
        head = await builder(db, slug, base_url)
        if head:
            return head
        if kind == "product":
            return not_found_head(base_url, "Product Not Found")

    return not_found_head(base_url)


def not_found_head(base_url: str, title: str = "Page Not Found") -> PageHead:
    """NotFoundPage.tsx (and the not-found states of the product and content pages)."""
    return PageHead(
        title=_branded(title),
        status=404,
        robots="noindex",
        noscript=f'<h1>Page Not Found</h1><p><a href="{_e(base_url)}/">Back to {_e(SITE_NAME)}</a></p>',
    )


async def current_home_description(db: AsyncSession) -> str:
    return home_description(int((await get_store_settings(db))["checkout_free_shipping_from"]))


async def _home_head(db: AsyncSession, base_url: str) -> PageHead:
    banner_image = (await db.execute(
        select(Banner.image_url)
        .where(Banner.position == "hero", Banner.is_active == True)
        .order_by(Banner.display_order)
        .limit(1)
    )).scalar_one_or_none()
    categories = (await db.execute(
        select(Category.name, Category.slug)
        .where(
            Category.is_active == True,
            Category.id.in_(select(Product.category_id).where(Product.status == "active")),
        )
        .order_by(Category.display_order)
    )).all()
    products = (await db.execute(
        select(Product.name, Product.slug, Product.base_price)
        .where(Product.status == "active")
        .order_by(Product.created_at.desc())
        .limit(24)
    )).all()

    image, image_size = _social_image(banner_image)
    category_links = "".join(
        f'<li><a href="{_e(base_url)}/category/{_e(c.slug)}">{_e(c.name)}</a></li>' for c in categories
    )
    description = await current_home_description(db)
    return PageHead(
        title=_branded(None),
        description=description,
        og_title=HOME_TITLE,
        image=image,
        image_size=image_size,
        image_alt=SITE_NAME,
        static_json_ld=[{
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Organization",
                    "@id": f"{base_url}/#organization",
                    "name": SITE_NAME,
                    "url": f"{base_url}/",
                    "logo": f"{base_url}{DEFAULT_IMAGE}",
                    "sameAs": SOCIAL_PROFILES,
                    "email": STORE_EMAIL,
                    "telephone": STORE_PHONE,
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "Ferozepur Road, Ichhra",
                        "addressLocality": "Lahore",
                        "addressCountry": "PK",
                    },
                },
                {
                    "@type": "WebSite",
                    "@id": f"{base_url}/#website",
                    "name": SITE_NAME,
                    "url": f"{base_url}/",
                    "publisher": {"@id": f"{base_url}/#organization"},
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": {"@type": "EntryPoint", "urlTemplate": f"{base_url}/search?q={{search_term_string}}"},
                        "query-input": "required name=search_term_string",
                    },
                },
            ],
        }],
        noscript=(
            f"<h1>{_e(HOME_H1)}</h1><p>{_e(description)}</p>"
            + (f"<h2>Shop by category</h2><ul>{category_links}</ul>" if category_links else "")
            + (f"<h2>Latest products</h2>{_product_list(products, base_url)}" if products else "")
        ),
    )


async def _product_head(db: AsyncSession, slug: str, base_url: str) -> PageHead | None:
    """ProductPage.tsx and productStructuredData() in utils/seo.ts."""
    product = (await db.execute(
        select(Product)
        .options(*_product_eager_options())
        .where(Product.slug == slug, Product.status == "active")
    )).scalar_one_or_none()
    if not product:
        return None

    url = f"{base_url}/product/{product.slug}"
    price = float(product.base_price)
    stocked = in_stock(product)
    images = sorted_images(product)
    text = product.short_description or html_to_text(product.description or "")
    short_name = short_product_name(product.name)
    description = product.meta_description or truncate_text(
        f"Shop the {short_name} at {SITE_NAME}. {text}".strip(), 160
    )
    page_title = product.meta_title or product_title(product.name)
    category = product.category

    breadcrumbs = [{"name": "Home", "url": f"{base_url}/"}]
    if category:
        breadcrumbs.append({"name": category.name or category.slug, "url": f"{base_url}/category/{category.slug}"})
    breadcrumbs.append({"name": product.name, "url": url})

    offer = {
        "@type": "Offer",
        "url": url,
        "price": price,
        "priceCurrency": CURRENCY,
        "availability": f"https://schema.org/{'InStock' if stocked else 'OutOfStock'}",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": {"@type": "Organization", "name": SITE_NAME},
    }
    product_ld = {
        "@type": "Product",
        "@id": f"{url}#product",
        "name": product.name,
        "url": url,
        "image": [_absolute(base_url, img.url) for img in images],
        **({"description": truncate_text(text, 5000)} if text else {}),
        "sku": product.sku or str(product.id),
        "brand": {"@type": "Brand", "name": SITE_NAME},
        **({"category": category.name} if category and category.name else {}),
        "offers": offer,
    }
    if product.review_count > 0:
        product_ld["aggregateRating"] = {
            "@type": "AggregateRating",
            "ratingValue": float(product.avg_rating),
            "reviewCount": product.review_count,
        }

    image, image_size = _social_image(images[0].url if images else None)
    compare_at = float(product.compare_at_price) if product.compare_at_price else None
    options = "".join(
        f"<li>{_e(opt.name)}: {_e(', '.join(v.value for v in sorted(opt.values, key=lambda v: v.display_order)))}</li>"
        for opt in sorted(product.options, key=lambda o: o.display_order)
        if opt.values
    )
    crumb_links = " › ".join(f'<a href="{_e(c["url"])}">{_e(c["name"])}</a>' for c in breadcrumbs[:-1])
    free_shipping = free_shipping_phrase(int((await get_store_settings(db))["checkout_free_shipping_from"]))
    noscript = (
        f"<nav>{crumb_links}</nav><h1>{_e(product.name)}</h1>"
        f"<p>{_e(format_price(price))}"
        + (f" <s>{_e(format_price(compare_at))}</s>" if compare_at and compare_at > price else "")
        + f" · {'In stock' if stocked else 'Out of stock'}"
        + f" · Cash on delivery · {_e(free_shipping[:1].upper() + free_shipping[1:])}</p>"
        + (f"<ul>{options}</ul>" if options else "")
        + (f"<p>{_e(html_to_text(product.description))}</p>" if product.description else "")
    )

    return PageHead(
        title=_branded(page_title),
        description=description,
        og_title=page_title,
        og_type="product",
        image=image,
        image_size=image_size,
        image_alt=(images[0].alt_text or product.name) if images else None,
        product_tags={
            "product:retailer_item_id": str(product.id),
            "product:brand": SITE_NAME,
            "product:price:amount": f"{price:.2f}",
            "product:price:currency": CURRENCY,
            "product:availability": "in stock" if stocked else "out of stock",
            "product:condition": "new",
        },
        json_ld=[{
            "@context": "https://schema.org",
            "@graph": [
                product_ld,
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {"@type": "ListItem", "position": i + 1, "name": c["name"], "item": c["url"]}
                        for i, c in enumerate(breadcrumbs)
                    ],
                },
            ],
        }],
        noscript=noscript,
    )


async def _is_empty_listing(db: AsyncSession, kind: str, slug: str) -> bool:
    """Same "coming soon" rule as the storefront pages, menus and sitemap (listing_service)."""
    category_slugs, collection_slugs = await get_listings_with_products(db)
    return slug not in (category_slugs if kind == "category" else collection_slugs)


async def _category_head(db: AsyncSession, slug: str, base_url: str) -> PageHead | None:
    """CategoryPage.tsx. The no-JS fallback lists the products directly in the category, like the page."""
    category = (await db.execute(
        select(Category).where(Category.slug == slug, Category.is_active == True)
    )).scalar_one_or_none()
    if not category:
        return None

    products = (await db.execute(
        select(Product.name, Product.slug, Product.base_price)
        .where(Product.category_id == category.id, Product.status == "active")
        .order_by(Product.created_at.desc())
        .limit(LISTING_LIMIT)
    )).all()
    description = category.meta_description or (
        truncate_text(_first_paragraph(category.description), 160)
        if category.description
        else f"Shop {category.name} at {SITE_NAME}. {TAGLINE}."
    )
    image, image_size = _social_image(category.image_url)
    return PageHead(
        # A custom meta title is used as-is (titleTemplate '%s')
        title=category.meta_title or _branded(category.name),
        description=description,
        og_title=category.meta_title or category.name,
        # Thin "coming soon" pages aren't indexed; links on them are still followed
        robots="noindex, follow" if await _is_empty_listing(db, "category", slug) else None,
        image=image,
        image_size=image_size,
        image_alt=category.name,
        json_ld=[_breadcrumbs(base_url, [(category.name, f"/category/{category.slug}")])],
        noscript=(
            f"<h1>{_e(category.name)}</h1>"
            + (f"<p>{_e(category.description)}</p>" if category.description else "")
            + _product_list(products, base_url)
        ),
    )


async def _collection_head(db: AsyncSession, slug: str, base_url: str) -> PageHead | None:
    """CollectionPage.tsx."""
    collection = (await db.execute(
        select(Collection).where(Collection.slug == slug, Collection.is_active == True)
    )).scalar_one_or_none()
    if not collection:
        return None

    products = (await db.execute(
        select(Product.name, Product.slug, Product.base_price)
        .join(CollectionProduct, CollectionProduct.product_id == Product.id)
        .where(CollectionProduct.collection_id == collection.id, Product.status == "active")
        .order_by(Product.created_at.desc())
        .limit(LISTING_LIMIT)
    )).all()
    description = collection.meta_description or (
        truncate_text(collection.description, 160)
        if collection.description
        else f"Shop the {collection.name} collection at {SITE_NAME}. {TAGLINE}."
    )
    image, image_size = _social_image(collection.image_url)
    return PageHead(
        title=collection.meta_title or _branded(f"{collection.name} T-Shirts and Tees"),
        description=description,
        og_title=collection.meta_title or f"{collection.name} T-Shirts and Tees",
        robots="noindex, follow" if await _is_empty_listing(db, "collections", slug) else None,
        image=image,
        image_size=image_size,
        image_alt=collection.name,
        json_ld=[_breadcrumbs(base_url, [(collection.name, f"/collections/{collection.slug}")])],
        noscript=(
            f"<h1>{_e(collection.name)}</h1>"
            + (f"<p>{_e(collection.description)}</p>" if collection.description else "")
            + _product_list(products, base_url)
        ),
    )


async def _content_page_head(db: AsyncSession, slug: str, base_url: str) -> PageHead | None:
    """ContentPage.tsx."""
    page = (await db.execute(
        select(Page).where(Page.slug == slug, Page.is_published == True)
    )).scalar_one_or_none()
    if not page:
        return None

    text = html_to_text(page.content or "")
    # Admin-written rich text; drop anything executable and keep it from closing the <noscript>
    content = _UNSAFE_BLOCK.sub("", page.content or "").replace("</noscript", "&lt;/noscript")
    return PageHead(
        title=page.meta_title or _branded(page.title),
        description=page.meta_description or (truncate_text(text, 160) if text else DEFAULT_DESCRIPTION),
        og_title=page.meta_title or page.title,
        json_ld=[_breadcrumbs(base_url, [(page.title, f"/page/{page.slug}")])],
        noscript=f"<h1>{_e(page.title)}</h1>{content}",
    )


def _iso_utc(value) -> str | None:
    """Stored UTC timestamps as ISO 8601 with the zone (as the blog API returns them)."""
    if value is None:
        return None
    return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).isoformat()


def blog_posting_ld(post: BlogPost, base_url: str, description: str, image: str | None) -> dict:
    """BlogPosting JSON-LD. Same as blogPostingStructuredData() in frontend/src/utils/seo.ts."""
    author_name = post.author_name or SITE_NAME
    data = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": description,
        "datePublished": _iso_utc(post.published_at),
        "dateModified": _iso_utc(post.updated_at or post.published_at),
        "author": (
            {"@type": "Organization", "name": SITE_NAME, "url": f"{base_url}/"}
            if author_name == SITE_NAME
            else {"@type": "Person", "name": author_name}
        ),
        "publisher": {
            "@type": "Organization",
            "name": SITE_NAME,
            "logo": {"@type": "ImageObject", "url": f"{base_url}{DEFAULT_IMAGE}"},
        },
        "mainEntityOfPage": {"@type": "WebPage", "@id": f"{base_url}/blog/{post.slug}"},
        "inLanguage": "en-PK",
    }
    if image:
        data["image"] = [_absolute(base_url, image)]
    if post.category:
        data["articleSection"] = post.category
    return {key: value for key, value in data.items() if value is not None}


async def _blog_index_head(db: AsyncSession, base_url: str) -> PageHead:
    """BlogPage.tsx."""
    posts = await blog_service.all_live(db)
    items = "".join(
        f'<li><a href="{_e(base_url)}/blog/{_e(p.slug)}">{_e(p.title)}</a>'
        + (f" – {_e(p.excerpt)}" if p.excerpt else "")
        + "</li>"
        for p in posts
    )
    return PageHead(
        title=_branded(BLOG_TITLE),
        description=BLOG_DESCRIPTION,
        json_ld=[_breadcrumbs(base_url, [("Blog", "/blog")])],
        noscript=f"<h1>{_e(BLOG_TITLE)}</h1><p>{_e(BLOG_DESCRIPTION)}</p>" + (f"<ul>{items}</ul>" if items else ""),
    )


async def _blog_post_head(db: AsyncSession, slug: str, base_url: str) -> PageHead | None:
    """BlogPostPage.tsx."""
    post = await blog_service.get_published(db, slug)
    if not post:
        return None

    text = html_to_text(post.content or "")
    description = post.meta_description or post.excerpt or (truncate_text(text, 160) if text else BLOG_DESCRIPTION)
    image, image_size = _social_image(post.cover_image_url)
    article_tags = {
        "article:published_time": _iso_utc(post.published_at),
        "article:modified_time": _iso_utc(post.updated_at or post.published_at),
        "article:section": post.category,
    }
    # Admin-written rich text (sanitized on save); keep it from closing the <noscript>
    content = _UNSAFE_BLOCK.sub("", post.content or "").replace("</noscript", "&lt;/noscript")
    return PageHead(
        title=_branded(post.meta_title or post.title),
        description=description,
        og_title=post.meta_title or post.title,
        og_type="article",
        image=image,
        image_size=image_size,
        image_alt=post.cover_image_alt,
        product_tags={key: value for key, value in article_tags.items() if value},
        json_ld=[
            blog_posting_ld(post, base_url, description, post.cover_image_url),
            _breadcrumbs(base_url, [("Blog", "/blog"), (post.title, f"/blog/{post.slug}")]),
        ],
        noscript=f"<h1>{_e(post.title)}</h1>{content}",
    )


# ── Rendering ────────────────────────────────────────────────────────────────

_SEO_BLOCK = re.compile(r"<!--seo-->.*?<!--/seo-->", re.S)
NOSCRIPT_MARKER = "<!--seo-noscript-->"


def _json_ld_tag(data: dict, managed: bool) -> str:
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    # No backslashes inside f-string expressions: production runs Python 3.11
    rh_attr = ' data-rh="true"' if managed else ""
    return f'<script type="application/ld+json"{rh_attr}>{payload}</script>'


def head_tags(head: PageHead, path: str, base_url: str) -> str:
    """The <head> tags for a page. data-rh="true" marks tags react-helmet replaces once the app loads."""
    canonical = f"{base_url}{path}"  # Layout.tsx: SITE_URL + pathname
    description = head.description
    og_title = head.og_title or head.title.removesuffix(f" | {TITLE_SUFFIX}")
    tags = [
        f"<title>{_e(head.title)}</title>",
        f'<meta name="description" content="{_e(description)}" data-rh="true" />',
        f'<link rel="canonical" href="{_e(canonical)}" data-rh="true" />',
    ]
    # Layout.tsx's default; noindex pages override it
    robots = head.robots or ("index, follow" if head.status == 200 else "noindex")
    tags.append(f'<meta name="robots" content="{_e(robots)}" data-rh="true" />')

    if head.status == 200:
        image = _absolute(base_url, head.image or DEFAULT_IMAGE)
        og = [
            ("og:site_name", SITE_NAME),
            ("og:type", head.og_type),
            ("og:title", og_title),
            ("og:description", description),
            ("og:url", canonical),
            ("og:locale", "en_PK"),
            ("og:image", image),
        ]
        if head.image_size:
            og += [("og:image:width", str(head.image_size[0])), ("og:image:height", str(head.image_size[1]))]
        if head.image_alt:
            og.append(("og:image:alt", head.image_alt))
        og += list(head.product_tags.items())
        tags += [f'<meta property="{k}" content="{_e(v)}" data-rh="true" />' for k, v in og]

        twitter = [
            ("twitter:card", "summary_large_image" if head.image_size else "summary"),
            ("twitter:title", og_title),
            ("twitter:description", description),
            ("twitter:image", image),
        ]
        if head.image_alt:
            twitter.append(("twitter:image:alt", head.image_alt))
        tags += [f'<meta name="{k}" content="{_e(v)}" data-rh="true" />' for k, v in twitter]

    tags += [_json_ld_tag(data, managed=True) for data in head.json_ld]
    tags += [_json_ld_tag(data, managed=False) for data in head.static_json_ld]
    return "\n    ".join(tags)


def render_html(shell: str, head: PageHead, path: str, base_url: str) -> str:
    """Put ``head`` into the built index.html (between its <!--seo--> markers)."""
    tags = head_tags(head, path, base_url)
    if _SEO_BLOCK.search(shell):
        shell = _SEO_BLOCK.sub(lambda _: tags, shell, count=1)
    else:
        shell = shell.replace("</head>", f"    {tags}\n  </head>", 1)
    if head.noscript:
        shell = shell.replace(NOSCRIPT_MARKER, f"<noscript>{head.noscript}</noscript>", 1)
    return shell
