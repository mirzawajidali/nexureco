"""
Seed data script for nexure co. Fashion & Apparel ecommerce store.

Creates realistic seed data including admin/customer users, categories,
collections, products with options/variants, coupons, banners, pages,
store settings, newsletter subscribers, sample orders, reviews,
wishlists, and inventory logs.

Usage:
    python seed_data.py

Idempotent: checks if admin user already exists before seeding.
"""

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import bcrypt
from sqlalchemy import select

# ---------------------------------------------------------------------------
# Ensure the backend package is importable when running from the backend dir
# ---------------------------------------------------------------------------
sys.path.insert(0, ".")

from app.db.database import engine, AsyncSessionLocal, Base  # noqa: E402
from app.models import (  # noqa: E402
    User,
    Address,
    Category,
    Collection,
    CollectionProduct,
    Product,
    ProductImage,
    ProductOption,
    ProductOptionValue,
    ProductVariant,
    VariantOptionValue,
    Coupon,
    CouponUsage,
    Banner,
    Page,
    StoreSetting,
    NewsletterSubscriber,
    Order,
    OrderItem,
    OrderStatusHistory,
    Review,
    Wishlist,
    InventoryLog,
)

# ---------------------------------------------------------------------------
# Password hashing -- same scheme used by the application
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# ---------------------------------------------------------------------------
# Helper: current UTC time
# ---------------------------------------------------------------------------
def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Seed functions
# ---------------------------------------------------------------------------


async def seed_users(session) -> dict[str, User]:
    """Create 1 admin + 3 customer users with addresses."""

    print("[1/13] Seeding users ...")

    users_data = [
        {
            "email": "admin@nexure.co",
            "password": "Admin123!",
            "first_name": "Admin",
            "last_name": "User",
            "phone": "+923001234567",
            "role": "admin",
            "is_active": True,
            "email_verified": True,
        },
        {
            "email": "ahmed.khan@gmail.com",
            "password": "Customer123!",
            "first_name": "Ahmed",
            "last_name": "Khan",
            "phone": "+923211234567",
            "role": "customer",
            "is_active": True,
            "email_verified": True,
        },
        {
            "email": "fatima.malik@gmail.com",
            "password": "Customer123!",
            "first_name": "Fatima",
            "last_name": "Malik",
            "phone": "+923331234567",
            "role": "customer",
            "is_active": True,
            "email_verified": True,
        },
        {
            "email": "usman.raza@gmail.com",
            "password": "Customer123!",
            "first_name": "Usman",
            "last_name": "Raza",
            "phone": "+923451234567",
            "role": "customer",
            "is_active": True,
            "email_verified": False,
        },
    ]

    created: dict[str, User] = {}
    for u in users_data:
        user = User(
            email=u["email"],
            password_hash=hash_password(u["password"]),
            first_name=u["first_name"],
            last_name=u["last_name"],
            phone=u["phone"],
            role=u["role"],
            is_active=u["is_active"],
            email_verified=u["email_verified"],
        )
        session.add(user)
        created[u["email"]] = user

    await session.flush()

    # Add addresses for customers
    addresses = [
        Address(
            user_id=created["ahmed.khan@gmail.com"].id,
            label="Home",
            first_name="Ahmed",
            last_name="Khan",
            phone="+923211234567",
            address_line1="House 12, Street 5, F-8/3",
            city="Islamabad",
            state="ICT",
            postal_code="44000",
            country="Pakistan",
            is_default=True,
        ),
        Address(
            user_id=created["ahmed.khan@gmail.com"].id,
            label="Office",
            first_name="Ahmed",
            last_name="Khan",
            phone="+923211234567",
            address_line1="Blue Area, Jinnah Avenue",
            address_line2="Suite 402, 4th Floor",
            city="Islamabad",
            state="ICT",
            postal_code="44000",
            country="Pakistan",
            is_default=False,
        ),
        Address(
            user_id=created["fatima.malik@gmail.com"].id,
            label="Home",
            first_name="Fatima",
            last_name="Malik",
            phone="+923331234567",
            address_line1="Flat 4B, Al-Rehman Tower, Gulberg III",
            city="Lahore",
            state="Punjab",
            postal_code="54000",
            country="Pakistan",
            is_default=True,
        ),
        Address(
            user_id=created["usman.raza@gmail.com"].id,
            label="Home",
            first_name="Usman",
            last_name="Raza",
            phone="+923451234567",
            address_line1="Plot 23, Block 7, Clifton",
            city="Karachi",
            state="Sindh",
            postal_code="75600",
            country="Pakistan",
            is_default=True,
        ),
    ]
    session.add_all(addresses)
    await session.flush()

    print(f"       Created {len(created)} users with {len(addresses)} addresses.")
    return created


async def seed_categories(session) -> dict[str, Category]:
    """Create 5 top-level categories + subcategories."""

    print("[2/13] Seeding categories ...")

    categories_data = [
        {
            "name": "Men",
            "slug": "men",
            "description": "Explore our latest collection of men's clothing, shoes and accessories.",
            "display_order": 1,
            "meta_title": "Men's Clothing & Footwear | nexure co.",
            "meta_description": "Shop the latest men's fashion including t-shirts, sneakers, hoodies and more.",
        },
        {
            "name": "Women",
            "slug": "women",
            "description": "Discover stylish women's fashion from casual to athleisure.",
            "display_order": 2,
            "meta_title": "Women's Clothing & Footwear | nexure co.",
            "meta_description": "Shop trendy women's fashion with free shipping across Pakistan.",
        },
        {
            "name": "Kids",
            "slug": "kids",
            "description": "Fun and comfortable kids' clothing built for play and everyday wear.",
            "display_order": 3,
            "meta_title": "Kids' Clothing & Shoes | nexure co.",
            "meta_description": "Durable and stylish clothing for kids of all ages.",
        },
        {
            "name": "Sports",
            "slug": "sports",
            "description": "Performance sportswear and gear for every athlete.",
            "display_order": 4,
            "meta_title": "Sports & Activewear | nexure co.",
            "meta_description": "High-performance sportswear for training, running and gym.",
        },
        {
            "name": "Accessories",
            "slug": "accessories",
            "description": "Complete your look with bags, caps, socks and more.",
            "display_order": 5,
            "meta_title": "Accessories | nexure co.",
            "meta_description": "Shop bags, caps, socks and other accessories online.",
        },
    ]

    created: dict[str, Category] = {}
    for c in categories_data:
        cat = Category(
            name=c["name"],
            slug=c["slug"],
            description=c["description"],
            display_order=c["display_order"],
            is_active=True,
            meta_title=c["meta_title"],
            meta_description=c["meta_description"],
        )
        session.add(cat)
        created[c["slug"]] = cat

    await session.flush()

    # Subcategories
    subcategories_data = [
        {"name": "T-Shirts", "slug": "men-tshirts", "parent": "men", "order": 1},
        {"name": "Hoodies", "slug": "men-hoodies", "parent": "men", "order": 2},
        {"name": "Shoes", "slug": "men-shoes", "parent": "men", "order": 3},
        {"name": "Tops", "slug": "women-tops", "parent": "women", "order": 1},
        {"name": "Leggings", "slug": "women-leggings", "parent": "women", "order": 2},
        {"name": "Shoes", "slug": "women-shoes", "parent": "women", "order": 3},
    ]

    for sc in subcategories_data:
        subcat = Category(
            name=sc["name"],
            slug=sc["slug"],
            parent_id=created[sc["parent"]].id,
            display_order=sc["order"],
            is_active=True,
        )
        session.add(subcat)
        created[sc["slug"]] = subcat

    await session.flush()
    print(f"       Created {len(created)} categories (including subcategories).")
    return created


async def seed_collections(session) -> dict[str, Collection]:
    """Create 4 collections."""

    print("[3/13] Seeding collections ...")

    collections_data = [
        {
            "name": "New Arrivals",
            "slug": "new-arrivals",
            "description": "Check out the freshest drops and newest additions to our store.",
            "type": "manual",
            "is_featured": True,
            "display_order": 1,
        },
        {
            "name": "Best Sellers",
            "slug": "best-sellers",
            "description": "Our most popular products loved by customers across Pakistan.",
            "type": "manual",
            "is_featured": True,
            "display_order": 2,
        },
        {
            "name": "Summer Collection",
            "slug": "summer-collection",
            "description": "Beat the heat with our breathable, lightweight summer essentials.",
            "type": "manual",
            "is_featured": True,
            "display_order": 3,
        },
        {
            "name": "Sale",
            "slug": "sale",
            "description": "Grab the best deals and discounts on your favourite styles.",
            "type": "manual",
            "is_featured": False,
            "display_order": 4,
        },
    ]

    created: dict[str, Collection] = {}
    for c in collections_data:
        col = Collection(
            name=c["name"],
            slug=c["slug"],
            description=c["description"],
            type=c["type"],
            is_featured=c["is_featured"],
            is_active=True,
            display_order=c["display_order"],
        )
        session.add(col)
        created[c["slug"]] = col

    await session.flush()
    print(f"       Created {len(created)} collections.")
    return created


async def seed_products(
    session,
    categories: dict[str, Category],
    collections: dict[str, Collection],
) -> list[Product]:
    """Create 18 products with images, options, variants."""

    print("[4/13] Seeding products ...")

    # (name, slug, category_slug, base_price, compare_at_price, short_desc, tags, is_featured, collection_slugs)
    products_data = [
        # --- Men ---
        ("Classic Logo T-Shirt", "classic-logo-t-shirt", "men", 2500, 3000,
         "Soft cotton crew-neck tee with embroidered logo.",
         ["t-shirt", "men", "cotton", "casual"], True, ["new-arrivals", "best-sellers"]),
        ("Essentials Hoodie", "essentials-hoodie", "men", 5500, 6500,
         "Fleece-lined pullover hoodie with kangaroo pocket.",
         ["hoodie", "men", "winter", "fleece"], True, ["best-sellers"]),
        ("Slim Fit Joggers", "slim-fit-joggers", "men", 4000, 4500,
         "Tapered joggers with zip pockets for everyday comfort.",
         ["joggers", "men", "casual", "cotton"], False, ["new-arrivals"]),
        ("UltraBoost Running Sneakers", "ultraboost-running-sneakers", "men", 15000, None,
         "Responsive cushioning for long-distance running.",
         ["sneakers", "men", "running", "shoes"], True, ["best-sellers"]),
        ("Polo Shirt - Striped", "polo-shirt-striped", "men", 3500, 4000,
         "Cotton pique polo with contrast stripes.",
         ["polo", "men", "casual", "cotton"], False, ["sale"]),
        # --- Women ---
        ("Cropped Zip Hoodie", "cropped-zip-hoodie", "women", 4500, 5500,
         "Relaxed-fit cropped hoodie with full zip.",
         ["hoodie", "women", "cropped", "athleisure"], True, ["new-arrivals"]),
        ("High-Waist Leggings", "high-waist-leggings", "women", 3500, 4000,
         "Squat-proof leggings with seamless waistband.",
         ["leggings", "women", "gym", "activewear"], False, ["best-sellers", "sale"]),
        ("Oversized Graphic Tee", "oversized-graphic-tee", "women", 2800, 3200,
         "Boxy-fit tee with street-style graphic print.",
         ["t-shirt", "women", "graphic", "casual"], False, ["summer-collection"]),
        ("Mesh Running Shoes", "mesh-running-shoes", "women", 12000, 13500,
         "Lightweight mesh upper with cloud-foam sole.",
         ["sneakers", "women", "running", "shoes"], True, ["new-arrivals"]),
        # --- Kids ---
        ("Kids Colour-Block Tee", "kids-colour-block-tee", "kids", 1500, 2000,
         "Bright colour-block design in soft jersey cotton.",
         ["t-shirt", "kids", "cotton", "casual"], False, ["summer-collection", "sale"]),
        ("Kids Jogger Set", "kids-jogger-set", "kids", 3200, 3800,
         "Matching hoodie and jogger set for play time.",
         ["joggers", "kids", "set", "casual"], False, []),
        ("Kids Velcro Sneakers", "kids-velcro-sneakers", "kids", 4500, 5000,
         "Easy on/off velcro sneakers in fun colours.",
         ["sneakers", "kids", "shoes", "velcro"], True, ["new-arrivals"]),
        # --- Sports ---
        ("Dri-Fit Training Tee", "dri-fit-training-tee", "sports", 2800, 3500,
         "Moisture-wicking fabric keeps you cool during workouts.",
         ["t-shirt", "sports", "dri-fit", "gym"], False, ["summer-collection"]),
        ("Performance Shorts", "performance-shorts", "sports", 3000, 3500,
         "Stretch-woven shorts with internal brief.",
         ["shorts", "sports", "gym", "training"], False, ["summer-collection", "sale"]),
        ("Track Jacket", "track-jacket", "sports", 6000, 7000,
         "Full-zip track jacket with side stripes.",
         ["jacket", "sports", "track", "training"], True, ["best-sellers"]),
        # --- Accessories ---
        ("Classic Cap", "classic-cap", "accessories", 1800, 2200,
         "Adjustable strap cap with embroidered logo.",
         ["cap", "accessories", "unisex"], False, ["sale"]),
        ("Gym Duffle Bag", "gym-duffle-bag", "accessories", 5500, 6500,
         "Spacious duffle with shoe compartment and water-resistant base.",
         ["bag", "accessories", "gym", "duffle"], False, ["new-arrivals"]),
        ("Crew Socks 3-Pack", "crew-socks-3-pack", "accessories", 1200, 1500,
         "Cushioned crew socks with arch support. Pack of 3.",
         ["socks", "accessories", "pack"], False, []),
    ]

    sizes = ["S", "M", "L", "XL"]
    colours = ["Black", "White", "Navy"]
    shoe_sizes = ["7", "8", "9", "10", "11"]

    shoe_slugs = {
        "ultraboost-running-sneakers",
        "mesh-running-shoes",
        "kids-velcro-sneakers",
    }

    no_variant_slugs = {
        "classic-cap",
        "gym-duffle-bag",
        "crew-socks-3-pack",
    }

    created_products: list[Product] = []
    sku_counter = 1000

    for (
        name, slug, cat_slug, base_price, compare_price,
        short_desc, tags, is_featured, col_slugs,
    ) in products_data:
        product = Product(
            category_id=categories[cat_slug].id,
            name=name,
            slug=slug,
            description=(
                f"<p>{short_desc}</p>"
                "<p>Made with premium quality materials for lasting comfort and style. "
                "Perfect for everyday wear.</p>"
            ),
            short_description=short_desc,
            base_price=Decimal(str(base_price)),
            compare_at_price=Decimal(str(compare_price)) if compare_price else None,
            cost_price=Decimal(str(int(base_price * 0.5))),
            sku=f"NX-{slug.upper()[:10]}-{sku_counter}",
            status="active",
            is_featured=is_featured,
            requires_shipping=True,
            tags=tags,
            meta_title=f"{name} | nexure co.",
            meta_description=short_desc,
            total_sold=0,
            avg_rating=Decimal("0"),
            review_count=0,
        )
        session.add(product)
        await session.flush()

        # --- Images (2 per product) ---
        img1 = ProductImage(
            product_id=product.id,
            url=f"/uploads/products/{slug}.jpg",
            alt_text=name,
            display_order=0,
            is_primary=True,
        )
        img2 = ProductImage(
            product_id=product.id,
            url=f"/uploads/products/{slug}-alt.jpg",
            alt_text=f"{name} - alternate view",
            display_order=1,
            is_primary=False,
        )
        session.add_all([img1, img2])

        # --- Options & Variants ---
        if slug in no_variant_slugs:
            variant = ProductVariant(
                product_id=product.id,
                sku=f"NX-{sku_counter}-DEF",
                price=Decimal(str(base_price)),
                compare_at_price=Decimal(str(compare_price)) if compare_price else None,
                cost_price=Decimal(str(int(base_price * 0.5))),
                stock_quantity=50,
                low_stock_threshold=5,
                is_active=True,
            )
            session.add(variant)
            await session.flush()

        elif slug in shoe_slugs:
            size_option = ProductOption(
                product_id=product.id, name="Size", display_order=0,
            )
            session.add(size_option)
            await session.flush()

            size_vals: dict[str, ProductOptionValue] = {}
            for idx, sz in enumerate(shoe_sizes):
                ov = ProductOptionValue(
                    option_id=size_option.id, value=sz, display_order=idx,
                )
                session.add(ov)
                size_vals[sz] = ov
            await session.flush()

            for sz, sz_val in size_vals.items():
                sku_counter += 1
                variant = ProductVariant(
                    product_id=product.id,
                    sku=f"NX-{sku_counter}-SZ{sz}",
                    price=Decimal(str(base_price)),
                    compare_at_price=Decimal(str(compare_price)) if compare_price else None,
                    cost_price=Decimal(str(int(base_price * 0.5))),
                    stock_quantity=20,
                    low_stock_threshold=3,
                    is_active=True,
                )
                session.add(variant)
                await session.flush()

                session.add(VariantOptionValue(
                    variant_id=variant.id,
                    option_value_id=sz_val.id,
                ))

        else:
            size_option = ProductOption(
                product_id=product.id, name="Size", display_order=0,
            )
            colour_option = ProductOption(
                product_id=product.id, name="Color", display_order=1,
            )
            session.add_all([size_option, colour_option])
            await session.flush()

            size_vals: dict[str, ProductOptionValue] = {}
            for idx, sz in enumerate(sizes):
                ov = ProductOptionValue(
                    option_id=size_option.id, value=sz, display_order=idx,
                )
                session.add(ov)
                size_vals[sz] = ov

            colour_vals: dict[str, ProductOptionValue] = {}
            for idx, clr in enumerate(colours):
                ov = ProductOptionValue(
                    option_id=colour_option.id, value=clr, display_order=idx,
                )
                session.add(ov)
                colour_vals[clr] = ov

            await session.flush()

            for sz, sz_val in size_vals.items():
                for clr, clr_val in colour_vals.items():
                    sku_counter += 1
                    variant = ProductVariant(
                        product_id=product.id,
                        sku=f"NX-{sku_counter}-{sz}-{clr[:3].upper()}",
                        price=Decimal(str(base_price)),
                        compare_at_price=Decimal(str(compare_price)) if compare_price else None,
                        cost_price=Decimal(str(int(base_price * 0.5))),
                        stock_quantity=25,
                        low_stock_threshold=5,
                        is_active=True,
                    )
                    session.add(variant)
                    await session.flush()

                    session.add(VariantOptionValue(
                        variant_id=variant.id,
                        option_value_id=sz_val.id,
                    ))
                    session.add(VariantOptionValue(
                        variant_id=variant.id,
                        option_value_id=clr_val.id,
                    ))

        # --- Collection links ---
        for col_slug in col_slugs:
            session.add(CollectionProduct(
                collection_id=collections[col_slug].id,
                product_id=product.id,
                display_order=0,
            ))

        sku_counter += 1
        created_products.append(product)

    await session.flush()
    print(f"       Created {len(created_products)} products with options & variants.")
    return created_products


async def seed_coupons(session) -> dict[str, Coupon]:
    """Create 5 coupons."""

    print("[5/13] Seeding coupons ...")

    now = utcnow()
    coupons_data = [
        {
            "code": "WELCOME10",
            "description": "10% off for new customers",
            "type": "percentage",
            "value": Decimal("10.00"),
            "min_order_amount": Decimal("2000.00"),
            "max_discount": Decimal("1000.00"),
            "usage_limit": 500,
            "usage_per_customer": 1,
            "starts_at": now - timedelta(days=30),
            "expires_at": now + timedelta(days=180),
        },
        {
            "code": "SUMMER20",
            "description": "20% off on summer collection",
            "type": "percentage",
            "value": Decimal("20.00"),
            "min_order_amount": Decimal("3000.00"),
            "max_discount": Decimal("2000.00"),
            "usage_limit": 200,
            "usage_per_customer": 2,
            "starts_at": now - timedelta(days=10),
            "expires_at": now + timedelta(days=90),
        },
        {
            "code": "FLAT500",
            "description": "Flat Rs.500 off on orders above Rs.3000",
            "type": "fixed_amount",
            "value": Decimal("500.00"),
            "min_order_amount": Decimal("3000.00"),
            "max_discount": None,
            "usage_limit": 1000,
            "usage_per_customer": 3,
            "starts_at": now - timedelta(days=5),
            "expires_at": now + timedelta(days=60),
        },
        {
            "code": "FIRST15",
            "description": "15% off on your first order",
            "type": "percentage",
            "value": Decimal("15.00"),
            "min_order_amount": Decimal("1500.00"),
            "max_discount": Decimal("1500.00"),
            "usage_limit": None,
            "usage_per_customer": 1,
            "starts_at": now - timedelta(days=60),
            "expires_at": now + timedelta(days=365),
        },
        {
            "code": "NEXURE30",
            "description": "Mega sale - 30% off sitewide",
            "type": "percentage",
            "value": Decimal("30.00"),
            "min_order_amount": Decimal("5000.00"),
            "max_discount": Decimal("3000.00"),
            "usage_limit": 100,
            "usage_per_customer": 1,
            "starts_at": now + timedelta(days=15),
            "expires_at": now + timedelta(days=20),
        },
    ]

    created: dict[str, Coupon] = {}
    for c in coupons_data:
        coupon = Coupon(
            code=c["code"],
            description=c["description"],
            type=c["type"],
            value=c["value"],
            min_order_amount=c["min_order_amount"],
            max_discount=c["max_discount"],
            usage_limit=c["usage_limit"],
            usage_per_customer=c["usage_per_customer"],
            used_count=0,
            is_active=True,
            starts_at=c["starts_at"],
            expires_at=c["expires_at"],
        )
        session.add(coupon)
        created[c["code"]] = coupon

    await session.flush()
    print(f"       Created {len(created)} coupons.")
    return created


async def seed_banners(session) -> list[Banner]:
    """Create 3 hero banners + 1 announcement."""

    print("[6/13] Seeding banners ...")

    banners_data = [
        {
            "title": "New Season, New Style",
            "subtitle": "Explore our latest arrivals and upgrade your wardrobe with fresh fashion.",
            "image_url": "/uploads/banners/hero-new-arrivals.jpg",
            "mobile_image_url": "/uploads/banners/hero-new-arrivals-mobile.jpg",
            "link_url": "/collections/new-arrivals",
            "button_text": "Shop Now",
            "position": "hero",
            "display_order": 1,
        },
        {
            "title": "Summer Essentials",
            "subtitle": "Beat the heat with breathable tees, shorts and sneakers. Up to 30% off.",
            "image_url": "/uploads/banners/hero-summer.jpg",
            "mobile_image_url": "/uploads/banners/hero-summer-mobile.jpg",
            "link_url": "/collections/summer-collection",
            "button_text": "Shop Summer",
            "position": "hero",
            "display_order": 2,
        },
        {
            "title": "Best Sellers",
            "subtitle": "Our most loved products, chosen by thousands of customers.",
            "image_url": "/uploads/banners/hero-best-sellers.jpg",
            "mobile_image_url": "/uploads/banners/hero-best-sellers-mobile.jpg",
            "link_url": "/collections/best-sellers",
            "button_text": "View Collection",
            "position": "hero",
            "display_order": 3,
        },
        {
            "title": "Free shipping on orders above Rs. 3,000",
            "subtitle": None,
            "image_url": "/uploads/banners/announcement.jpg",
            "mobile_image_url": None,
            "link_url": "/page/shipping",
            "button_text": "Learn More",
            "position": "announcement",
            "display_order": 1,
        },
    ]

    created: list[Banner] = []
    for b in banners_data:
        banner = Banner(
            title=b["title"],
            subtitle=b["subtitle"],
            image_url=b["image_url"],
            mobile_image_url=b["mobile_image_url"],
            link_url=b["link_url"],
            button_text=b["button_text"],
            position=b["position"],
            display_order=b["display_order"],
            is_active=True,
        )
        session.add(banner)
        created.append(banner)

    await session.flush()
    print(f"       Created {len(created)} banners.")
    return created


async def seed_pages(session) -> list[Page]:
    """Create static CMS pages."""

    print("[7/13] Seeding pages ...")

    pages_data = [
        {
            "title": "About Us",
            "slug": "about",
            "content": (
                "<h2>Who We Are</h2>"
                "<p>nexure co. is a leading fashion and apparel destination in Pakistan, "
                "offering high-quality clothing, footwear and accessories for men, women and kids.</p>"
                "<h2>Our Mission</h2>"
                "<p>We believe everyone deserves to look and feel their best. Our mission is to "
                "deliver stylish, comfortable and affordable fashion to your doorstep with exceptional "
                "customer service.</p>"
                "<h2>Why Choose Us</h2>"
                "<ul>"
                "<li>Premium quality fabrics and materials</li>"
                "<li>Free shipping on orders above Rs. 3,000</li>"
                "<li>Easy 7-day return policy</li>"
                "<li>Cash on delivery available nationwide</li>"
                "</ul>"
            ),
            "is_published": True,
            "meta_title": "About Us | nexure co.",
            "meta_description": "Learn about nexure co. - Pakistan's favourite fashion destination.",
        },
        {
            "title": "Contact Us",
            "slug": "contact",
            "content": (
                "<h2>Get In Touch</h2>"
                "<p>We'd love to hear from you! Whether you have a question about our products, "
                "need help with an order, or just want to say hello — our team is here for you.</p>"
                "<h3>Customer Support</h3>"
                "<ul>"
                "<li><strong>Email:</strong> support@nexure.co</li>"
                "<li><strong>Phone:</strong> +92-300-1234567 (Mon-Sat, 10 AM - 7 PM)</li>"
                "<li><strong>WhatsApp:</strong> +92-300-1234567</li>"
                "</ul>"
                "<h3>Head Office</h3>"
                "<p>Office 12, 3rd Floor, Centaurus Mall<br>"
                "Islamabad, Pakistan 44000</p>"
                "<h3>Business Inquiries</h3>"
                "<p>For wholesale, partnerships and media enquiries, please email "
                "<strong>business@nexure.co</strong></p>"
            ),
            "is_published": True,
            "meta_title": "Contact Us | nexure co.",
            "meta_description": "Get in touch with nexure co. - customer support, business inquiries and more.",
        },
        {
            "title": "Careers",
            "slug": "careers",
            "content": (
                "<h2>Join Our Team</h2>"
                "<p>At nexure co., we're building the future of fashion ecommerce in Pakistan. "
                "We're always looking for passionate, creative and driven individuals to join our team.</p>"
                "<h3>Why Work With Us</h3>"
                "<ul>"
                "<li>Competitive salaries and benefits</li>"
                "<li>Flexible and hybrid work environment</li>"
                "<li>Employee discounts on all products</li>"
                "<li>Growth opportunities in a fast-paced startup</li>"
                "<li>Collaborative and inclusive team culture</li>"
                "</ul>"
                "<h3>Open Positions</h3>"
                "<p>We're currently hiring for the following roles:</p>"
                "<ul>"
                "<li><strong>Senior Frontend Developer</strong> — React, TypeScript (Remote)</li>"
                "<li><strong>Marketing Manager</strong> — Social media & brand strategy (Islamabad)</li>"
                "<li><strong>Customer Support Lead</strong> — Order management & CX (Lahore/Karachi)</li>"
                "</ul>"
                "<p>Interested? Send your CV to <strong>careers@nexure.co</strong> with the "
                "role in the subject line.</p>"
            ),
            "is_published": True,
            "meta_title": "Careers | nexure co.",
            "meta_description": "Join the nexure co. team. Explore career opportunities in fashion ecommerce.",
        },
        {
            "title": "Privacy Policy",
            "slug": "privacy",
            "content": (
                "<h2>Privacy Policy</h2>"
                "<p>Your privacy is important to us. This policy describes how nexure co. collects, "
                "uses and protects your personal information when you use our website and services.</p>"
                "<h3>Information We Collect</h3>"
                "<p>We collect information you provide when creating an account, placing an order, "
                "or subscribing to our newsletter, including your name, email, phone number and "
                "shipping address.</p>"
                "<h3>How We Use Your Information</h3>"
                "<p>We use your data to process orders, improve our services, send relevant "
                "promotions (with your consent) and provide customer support.</p>"
                "<h3>Data Security</h3>"
                "<p>We implement industry-standard security measures to protect your data. "
                "Your payment information is never stored on our servers.</p>"
                "<h3>Your Rights</h3>"
                "<p>You may request access to, correction of, or deletion of your personal data "
                "at any time by contacting us at support@nexure.co.</p>"
            ),
            "is_published": True,
            "meta_title": "Privacy Policy | nexure co.",
            "meta_description": "Read nexure co.'s privacy policy on how we handle your data.",
        },
        {
            "title": "Terms of Service",
            "slug": "terms",
            "content": (
                "<h2>Terms of Service</h2>"
                "<p>By accessing and using the nexure co. website, you agree to be bound by "
                "the following terms and conditions.</p>"
                "<h3>Account Registration</h3>"
                "<p>You must provide accurate and complete information when creating an account. "
                "You are responsible for maintaining the confidentiality of your login credentials.</p>"
                "<h3>Orders & Payment</h3>"
                "<p>All orders are subject to product availability. We accept Cash on Delivery (COD) "
                "as the primary payment method. Prices are listed in Pakistani Rupees (PKR) and "
                "include applicable taxes.</p>"
                "<h3>Shipping & Delivery</h3>"
                "<p>We aim to deliver orders within 3-5 business days. Free shipping is available "
                "on orders above Rs. 3,000. Delivery timelines may vary during peak seasons.</p>"
                "<h3>Returns & Refunds</h3>"
                "<p>Items may be returned within 7 days of delivery. Returned items must be unworn, "
                "unwashed and in their original packaging. Refunds are processed within 5-7 business "
                "days after we receive the returned item.</p>"
                "<h3>Intellectual Property</h3>"
                "<p>All content on this website, including images, text, logos and designs, is the "
                "property of nexure co. and may not be reproduced without permission.</p>"
            ),
            "is_published": True,
            "meta_title": "Terms of Service | nexure co.",
            "meta_description": "Read the terms and conditions for using the nexure co. website.",
        },
        {
            "title": "Shipping & Returns",
            "slug": "shipping",
            "content": (
                "<h2>Shipping Policy</h2>"
                "<p>We offer nationwide delivery across Pakistan.</p>"
                "<ul>"
                "<li><strong>Standard Delivery:</strong> 3-5 business days - Rs. 200</li>"
                "<li><strong>Free Shipping:</strong> On all orders above Rs. 3,000</li>"
                "<li><strong>Same-Day Delivery:</strong> Available in Karachi, Lahore and Islamabad "
                "for orders placed before 12 PM - Rs. 500</li>"
                "</ul>"
                "<h2>Returns & Exchanges</h2>"
                "<p>Not satisfied? No worries!</p>"
                "<ul>"
                "<li>7-day easy return policy from the date of delivery</li>"
                "<li>Items must be unworn, unwashed and in original packaging</li>"
                "<li>Refunds are processed within 5-7 business days</li>"
                "<li>Exchange available for different size or colour (subject to availability)</li>"
                "</ul>"
            ),
            "is_published": True,
            "meta_title": "Shipping & Returns | nexure co.",
            "meta_description": "Learn about nexure co.'s shipping options and return policy.",
        },
        {
            "title": "FAQ",
            "slug": "faq",
            "content": (
                "<h2>Frequently Asked Questions</h2>"
                "<h3>How long does delivery take?</h3>"
                "<p>Standard delivery takes 3-5 business days. Same-day delivery is available "
                "in major cities for orders placed before 12 PM.</p>"
                "<h3>What payment methods do you accept?</h3>"
                "<p>We currently accept Cash on Delivery (COD) nationwide.</p>"
                "<h3>Can I return or exchange an item?</h3>"
                "<p>Yes! We offer a 7-day return policy. Items must be unworn and in original "
                "packaging. Visit our Shipping & Returns page for details.</p>"
                "<h3>How do I track my order?</h3>"
                "<p>Once your order is shipped, you'll receive a tracking number via email. "
                "You can also track your order from your account dashboard.</p>"
                "<h3>Do you offer international shipping?</h3>"
                "<p>Currently, we only ship within Pakistan. International shipping will be "
                "available soon.</p>"
            ),
            "is_published": True,
            "meta_title": "FAQ | nexure co.",
            "meta_description": "Find answers to frequently asked questions about nexure co.",
        },
    ]

    created: list[Page] = []
    for p in pages_data:
        page = Page(
            title=p["title"],
            slug=p["slug"],
            content=p["content"],
            is_published=p["is_published"],
            meta_title=p["meta_title"],
            meta_description=p["meta_description"],
        )
        session.add(page)
        created.append(page)

    await session.flush()
    print(f"       Created {len(created)} pages.")
    return created


async def seed_store_settings(session) -> None:
    """Create store settings key/value pairs."""

    print("[8/13] Seeding store settings ...")

    settings_data = [
        ("store_name", "nexure co.", "string"),
        ("store_email", "support@nexure.co", "string"),
        ("store_phone", "+92-300-1234567", "string"),
        ("store_address", "Office 12, 3rd Floor, Centaurus Mall, Islamabad, Pakistan", "string"),
        ("currency", "PKR", "string"),
        ("currency_symbol", "Rs.", "string"),
        ("tax_rate", "0", "number"),
        ("free_shipping_threshold", "3000", "number"),
        ("standard_shipping_rate", "200", "number"),
        ("store_logo_url", "/uploads/branding/logo.png", "string"),
        ("store_favicon_url", "/uploads/branding/favicon.ico", "string"),
        ("social_facebook", "https://facebook.com/nexureco", "string"),
        ("social_instagram", "https://instagram.com/nexureco", "string"),
        ("social_twitter", "https://twitter.com/nexureco", "string"),
        ("footer_about", "nexure co. is Pakistan's favourite fashion destination offering premium clothing, footwear and accessories.", "string"),
        ("meta_title", "nexure co. - Fashion & Apparel Pakistan", "string"),
        ("meta_description", "Shop the latest in men's, women's and kids' fashion online. Free shipping on orders above Rs. 3,000.", "string"),
        ("announcement_text", "Free shipping on all orders above Rs. 3,000 | Use code WELCOME10 for 10% off", "string"),
    ]

    for key, value, stype in settings_data:
        setting = StoreSetting(
            setting_key=key,
            setting_value=value,
            setting_type=stype,
        )
        session.add(setting)

    await session.flush()
    print(f"       Created {len(settings_data)} store settings.")


async def seed_newsletter_subscribers(session) -> None:
    """Create newsletter subscribers."""

    print("[9/13] Seeding newsletter subscribers ...")

    emails = [
        "ahmed.khan@gmail.com",
        "fatima.malik@gmail.com",
        "hira.shah@gmail.com",
        "bilal.ahmed@yahoo.com",
        "sana.noor@hotmail.com",
        "ali.hassan@gmail.com",
        "zara.iqbal@gmail.com",
        "hamza.asif@outlook.com",
    ]

    for email in emails:
        subscriber = NewsletterSubscriber(
            email=email,
            is_active=True,
        )
        session.add(subscriber)

    await session.flush()
    print(f"       Created {len(emails)} newsletter subscribers.")


async def seed_orders(
    session,
    users: dict[str, User],
    products: list[Product],
    coupons: dict[str, Coupon],
) -> list[Order]:
    """Create sample orders in various statuses."""

    print("[10/13] Seeding orders ...")

    now = utcnow()

    product_variants: dict[int, ProductVariant] = {}
    for product in products:
        result = await session.execute(
            select(ProductVariant)
            .where(ProductVariant.product_id == product.id)
            .limit(1)
        )
        variant = result.scalars().first()
        if variant:
            product_variants[product.id] = variant

    ahmed = users["ahmed.khan@gmail.com"]
    fatima = users["fatima.malik@gmail.com"]
    usman = users["usman.raza@gmail.com"]

    orders_data = [
        {
            "order_number": "NX-20260001",
            "user": ahmed,
            "status": "delivered",
            "payment_status": "paid",
            "products_idx": [0, 2],
            "quantities": [2, 1],
            "shipping_cost": Decimal("0"),
            "discount_amount": Decimal("0"),
            "shipping": {
                "first_name": "Ahmed", "last_name": "Khan", "phone": "+923211234567",
                "address1": "House 12, Street 5, F-8/3", "city": "Islamabad",
                "state": "ICT", "postal_code": "44000", "country": "Pakistan",
            },
            "created_at": now - timedelta(days=20),
            "tracking_number": "TCS-12345678",
            "tracking_url": "https://track.tcs.com.pk/TCS-12345678",
            "delivered_at": now - timedelta(days=15),
            "customer_note": "Please deliver between 2-5 PM.",
        },
        {
            "order_number": "NX-20260002",
            "user": fatima,
            "status": "shipped",
            "payment_status": "pending",
            "products_idx": [5, 6],
            "quantities": [1, 2],
            "shipping_cost": Decimal("0"),
            "discount_amount": Decimal("500"),
            "coupon_code": "FLAT500",
            "shipping": {
                "first_name": "Fatima", "last_name": "Malik", "phone": "+923331234567",
                "address1": "Flat 4B, Al-Rehman Tower, Gulberg III", "city": "Lahore",
                "state": "Punjab", "postal_code": "54000", "country": "Pakistan",
            },
            "created_at": now - timedelta(days=5),
            "tracking_number": "LEO-98765432",
            "tracking_url": "https://leopards.com.pk/track/LEO-98765432",
            "customer_note": None,
        },
        {
            "order_number": "NX-20260003",
            "user": usman,
            "status": "pending",
            "payment_status": "pending",
            "products_idx": [3],
            "quantities": [1],
            "shipping_cost": Decimal("0"),
            "discount_amount": Decimal("0"),
            "shipping": {
                "first_name": "Usman", "last_name": "Raza", "phone": "+923451234567",
                "address1": "Plot 23, Block 7, Clifton", "city": "Karachi",
                "state": "Sindh", "postal_code": "75600", "country": "Pakistan",
            },
            "created_at": now - timedelta(hours=3),
            "customer_note": "Ring the bell twice please.",
        },
        {
            "order_number": "NX-20260004",
            "user": ahmed,
            "status": "cancelled",
            "payment_status": "pending",
            "products_idx": [15],
            "quantities": [3],
            "shipping_cost": Decimal("200"),
            "discount_amount": Decimal("0"),
            "shipping": {
                "first_name": "Ahmed", "last_name": "Khan", "phone": "+923211234567",
                "address1": "House 12, Street 5, F-8/3", "city": "Islamabad",
                "state": "ICT", "postal_code": "44000", "country": "Pakistan",
            },
            "created_at": now - timedelta(days=10),
            "cancelled_at": now - timedelta(days=9),
            "admin_note": "Customer requested cancellation.",
            "customer_note": None,
        },
        {
            "order_number": "NX-20260005",
            "user": fatima,
            "status": "processing",
            "payment_status": "pending",
            "products_idx": [7, 17],
            "quantities": [1, 2],
            "shipping_cost": Decimal("0"),
            "discount_amount": Decimal("0"),
            "shipping": {
                "first_name": "Fatima", "last_name": "Malik", "phone": "+923331234567",
                "address1": "Flat 4B, Al-Rehman Tower, Gulberg III", "city": "Lahore",
                "state": "Punjab", "postal_code": "54000", "country": "Pakistan",
            },
            "created_at": now - timedelta(days=2),
            "customer_note": None,
        },
        {
            "order_number": "NX-20260006",
            "user": ahmed,
            "status": "confirmed",
            "payment_status": "pending",
            "products_idx": [1, 14],
            "quantities": [1, 1],
            "shipping_cost": Decimal("0"),
            "discount_amount": Decimal("1000"),
            "coupon_code": "WELCOME10",
            "shipping": {
                "first_name": "Ahmed", "last_name": "Khan", "phone": "+923211234567",
                "address1": "House 12, Street 5, F-8/3", "city": "Islamabad",
                "state": "ICT", "postal_code": "44000", "country": "Pakistan",
            },
            "created_at": now - timedelta(days=1),
            "customer_note": "Gift wrap please.",
        },
        {
            "order_number": "NX-20260007",
            "user": usman,
            "status": "delivered",
            "payment_status": "paid",
            "products_idx": [11, 9],
            "quantities": [1, 2],
            "shipping_cost": Decimal("0"),
            "discount_amount": Decimal("0"),
            "shipping": {
                "first_name": "Usman", "last_name": "Raza", "phone": "+923451234567",
                "address1": "Plot 23, Block 7, Clifton", "city": "Karachi",
                "state": "Sindh", "postal_code": "75600", "country": "Pakistan",
            },
            "created_at": now - timedelta(days=30),
            "tracking_number": "TCS-87654321",
            "tracking_url": "https://track.tcs.com.pk/TCS-87654321",
            "delivered_at": now - timedelta(days=25),
            "customer_note": None,
        },
    ]

    created_orders: list[Order] = []
    for o in orders_data:
        subtotal = Decimal("0")
        items_to_add: list[dict] = []

        for pidx, qty in zip(o["products_idx"], o["quantities"]):
            product = products[pidx]
            variant = product_variants.get(product.id)
            unit_price = product.base_price
            total_price = unit_price * qty
            subtotal += total_price

            items_to_add.append({
                "product_id": product.id,
                "variant_id": variant.id if variant else None,
                "product_name": product.name,
                "variant_info": variant.sku if variant else None,
                "sku": variant.sku if variant else product.sku,
                "quantity": qty,
                "unit_price": unit_price,
                "total_price": total_price,
                "image_url": f"/uploads/products/{product.slug}.jpg",
            })

        total = subtotal + o["shipping_cost"] - o["discount_amount"]
        shipping = o["shipping"]

        order = Order(
            order_number=o["order_number"],
            user_id=o["user"].id,
            status=o["status"],
            payment_method="cod",
            payment_status=o["payment_status"],
            subtotal=subtotal,
            shipping_cost=o["shipping_cost"],
            discount_amount=o["discount_amount"],
            tax_amount=Decimal("0"),
            total=total,
            coupon_code=o.get("coupon_code"),
            shipping_first_name=shipping["first_name"],
            shipping_last_name=shipping["last_name"],
            shipping_phone=shipping["phone"],
            shipping_address1=shipping["address1"],
            shipping_city=shipping["city"],
            shipping_state=shipping["state"],
            shipping_postal_code=shipping["postal_code"],
            shipping_country=shipping["country"],
            tracking_number=o.get("tracking_number"),
            tracking_url=o.get("tracking_url"),
            shipped_at=o["created_at"] + timedelta(days=2) if o.get("tracking_number") else None,
            delivered_at=o.get("delivered_at"),
            cancelled_at=o.get("cancelled_at"),
            customer_note=o.get("customer_note"),
            admin_note=o.get("admin_note"),
        )
        session.add(order)
        await session.flush()

        for item in items_to_add:
            session.add(OrderItem(order_id=order.id, **item))

        status_flow = {
            "pending": ["pending"],
            "confirmed": ["pending", "confirmed"],
            "processing": ["pending", "confirmed", "processing"],
            "shipped": ["pending", "confirmed", "processing", "shipped"],
            "delivered": ["pending", "confirmed", "processing", "shipped", "delivered"],
            "cancelled": ["pending", "cancelled"],
        }

        history_statuses = status_flow.get(o["status"], ["pending"])
        for idx, hs in enumerate(history_statuses):
            session.add(OrderStatusHistory(
                order_id=order.id,
                status=hs,
                note=f"Order status changed to {hs}",
                created_by=1,
            ))

        if o.get("coupon_code") and o["coupon_code"] in coupons:
            coupon = coupons[o["coupon_code"]]
            coupon.used_count += 1
            session.add(CouponUsage(
                coupon_id=coupon.id,
                user_id=o["user"].id,
                order_id=order.id,
            ))

        for pidx, qty in zip(o["products_idx"], o["quantities"]):
            if o["status"] in ("delivered", "shipped", "processing", "confirmed"):
                products[pidx].total_sold += qty

        created_orders.append(order)

    await session.flush()
    print(f"       Created {len(created_orders)} orders with items and status history.")
    return created_orders


async def seed_reviews(
    session,
    users: dict[str, User],
    products: list[Product],
) -> None:
    """Create product reviews and update product ratings."""

    print("[11/13] Seeding reviews ...")

    reviews_data = [
        {
            "product_idx": 0,
            "user_email": "ahmed.khan@gmail.com",
            "rating": 5,
            "title": "Perfect everyday tee",
            "comment": "Great quality cotton, fits perfectly. The logo stitching is very neat. Ordered two more!",
            "is_approved": True,
        },
        {
            "product_idx": 1,
            "user_email": "fatima.malik@gmail.com",
            "rating": 4,
            "title": "Warm and cozy",
            "comment": "Love the fleece lining, perfect for Islamabad winters. Slightly oversized so consider sizing down.",
            "is_approved": True,
        },
        {
            "product_idx": 3,
            "user_email": "ahmed.khan@gmail.com",
            "rating": 5,
            "title": "Best running shoes I have owned",
            "comment": "Incredible cushioning and support. Used them for a half marathon and my feet felt great!",
            "is_approved": True,
        },
        {
            "product_idx": 5,
            "user_email": "fatima.malik@gmail.com",
            "rating": 4,
            "title": "Cute and comfortable",
            "comment": "Love the cropped fit. Material is soft and breathable. Great for gym warmups.",
            "is_approved": True,
        },
        {
            "product_idx": 11,
            "user_email": "usman.raza@gmail.com",
            "rating": 5,
            "title": "My son loves these",
            "comment": "Easy for kids to put on themselves. Good build quality. Will buy again when he outgrows these.",
            "is_approved": True,
        },
        {
            "product_idx": 6,
            "user_email": "fatima.malik@gmail.com",
            "rating": 5,
            "title": "Absolutely love these",
            "comment": "Best leggings I've ever owned. Squat-proof and the waistband doesn't roll down. 10/10!",
            "is_approved": True,
        },
        {
            "product_idx": 14,
            "user_email": "ahmed.khan@gmail.com",
            "rating": 4,
            "title": "Great jacket for morning runs",
            "comment": "Lightweight but keeps the wind out. The side stripes look great. Wish it had more pockets.",
            "is_approved": True,
        },
        {
            "product_idx": 2,
            "user_email": "usman.raza@gmail.com",
            "rating": 3,
            "title": "Decent but could be better",
            "comment": "The fabric is nice but the zip on one pocket was a bit stiff. Comfortable for lounging though.",
            "is_approved": False,
        },
    ]

    count = 0
    for r in reviews_data:
        product = products[r["product_idx"]]
        user = users[r["user_email"]]
        review = Review(
            product_id=product.id,
            user_id=user.id,
            rating=r["rating"],
            title=r["title"],
            comment=r["comment"],
            is_approved=r["is_approved"],
        )
        session.add(review)
        count += 1

    await session.flush()

    from sqlalchemy import func as sqlfunc

    for product in products:
        result = await session.execute(
            select(
                sqlfunc.count(Review.id),
                sqlfunc.coalesce(sqlfunc.avg(Review.rating), 0),
            ).where(Review.product_id == product.id, Review.is_approved == True)
        )
        row = result.one()
        product.review_count = row[0]
        product.avg_rating = Decimal(str(round(float(row[1]), 2)))

    await session.flush()
    print(f"       Created {count} reviews ({count - 1} approved, 1 pending).")


async def seed_wishlists(
    session,
    users: dict[str, User],
    products: list[Product],
) -> None:
    """Create wishlist items for customers."""

    print("[12/13] Seeding wishlists ...")

    wishlist_data = [
        ("ahmed.khan@gmail.com", [1, 3, 8, 16]),
        ("fatima.malik@gmail.com", [0, 7, 12, 14]),
        ("usman.raza@gmail.com", [1, 5, 6]),
    ]

    count = 0
    for email, product_indices in wishlist_data:
        user = users[email]
        for pidx in product_indices:
            session.add(Wishlist(
                user_id=user.id,
                product_id=products[pidx].id,
            ))
            count += 1

    await session.flush()
    print(f"       Created {count} wishlist items.")


async def seed_inventory_logs(
    session,
    products: list[Product],
) -> None:
    """Create inventory adjustment logs for audit trail."""

    print("[13/13] Seeding inventory logs ...")

    variants: list[ProductVariant] = []
    for product in products[:6]:
        result = await session.execute(
            select(ProductVariant)
            .where(ProductVariant.product_id == product.id)
            .limit(2)
        )
        variants.extend(result.scalars().all())

    logs_data = [
        {"reason": "restock", "qty": 50, "note": "Initial stock received from supplier"},
        {"reason": "restock", "qty": 30, "note": "Restock shipment #RS-2026-001"},
        {"reason": "manual_adjustment", "qty": -3, "note": "Damaged items removed from inventory"},
        {"reason": "restock", "qty": 20, "note": "Restock shipment #RS-2026-002"},
        {"reason": "manual_adjustment", "qty": -1, "note": "Quality check - defective unit"},
        {"reason": "return", "qty": 2, "note": "Customer return - Order NX-20260001"},
    ]

    count = 0
    for i, log in enumerate(logs_data):
        if i < len(variants):
            session.add(InventoryLog(
                variant_id=variants[i].id,
                quantity_change=log["qty"],
                reason=log["reason"],
                note=log["note"],
            ))
            count += 1

    await session.flush()
    print(f"       Created {count} inventory log entries.")


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    print("=" * 60)
    print("  nexure co. -- Seed Data Script")
    print("=" * 60)
    print()

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == "admin@nexure.co")
        )
        existing_admin = result.scalars().first()

        if existing_admin:
            print("Admin user (admin@nexure.co) already exists.")
            print("Database appears to be already seeded. Skipping.")
            print()
            print("To re-seed, delete the admin user first or truncate the tables.")
            return

        try:
            users = await seed_users(session)
            categories = await seed_categories(session)
            collections = await seed_collections(session)
            products = await seed_products(session, categories, collections)
            coupons = await seed_coupons(session)
            await seed_banners(session)
            await seed_pages(session)
            await seed_store_settings(session)
            await seed_newsletter_subscribers(session)
            orders = await seed_orders(session, users, products, coupons)
            await seed_reviews(session, users, products)
            await seed_wishlists(session, users, products)
            await seed_inventory_logs(session, products)

            await session.commit()

            print()
            print("=" * 60)
            print("  Seed data created successfully!")
            print("=" * 60)
            print()
            print("  Admin login:")
            print("    Email:    admin@nexure.co")
            print("    Password: Admin123!")
            print()
            print("  Customer accounts (password: Customer123!):")
            print("    - ahmed.khan@gmail.com")
            print("    - fatima.malik@gmail.com")
            print("    - usman.raza@gmail.com")
            print()
            print("  Coupon codes:")
            print("    WELCOME10, SUMMER20, FLAT500, FIRST15, NEXURE30")
            print()

        except Exception:
            await session.rollback()
            print()
            print("ERROR: Seed data creation failed. Transaction rolled back.")
            raise


if __name__ == "__main__":
    asyncio.run(main())
