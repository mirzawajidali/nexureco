from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, users, products, categories, collections, search, media, cart, orders,
    wishlist, reviews, newsletter, banners, pages, contact, menus, chat, csp, coupons, checkout_drafts, payments,
    store,
    blog,
)
from app.api.v1.endpoints.admin import (
    dashboard as admin_dashboard,
    products as admin_products,
    categories as admin_categories,
    collections as admin_collections,
    orders as admin_orders,
    abandoned_checkouts as admin_abandoned_checkouts,
    customers as admin_customers,
    coupons as admin_coupons,
    inventory as admin_inventory,
    reviews as admin_reviews,
    content as admin_content,
    settings as admin_settings,
    analytics as admin_analytics,
    newsletter as admin_newsletter,
    media as admin_media,
    notifications as admin_notifications,
    search as admin_search,
    contact as admin_contact,
    roles as admin_roles,
    staff as admin_staff,
    blog as admin_blog,
)

api_router = APIRouter(prefix="/api/v1")

# Public storefront
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(products.router)
api_router.include_router(categories.router)
api_router.include_router(collections.router)
api_router.include_router(search.router)
api_router.include_router(media.router)
api_router.include_router(cart.router)
api_router.include_router(orders.router)
api_router.include_router(wishlist.router)
api_router.include_router(reviews.router)
api_router.include_router(newsletter.router)
api_router.include_router(banners.router)
api_router.include_router(pages.router)
api_router.include_router(contact.router)
api_router.include_router(menus.router)
api_router.include_router(chat.router)
api_router.include_router(csp.router)
api_router.include_router(coupons.router)
api_router.include_router(checkout_drafts.router)
api_router.include_router(payments.router)
api_router.include_router(store.router)
api_router.include_router(blog.router)

# Admin
api_router.include_router(admin_dashboard.router)
api_router.include_router(admin_products.router)
api_router.include_router(admin_categories.router)
api_router.include_router(admin_collections.router)
api_router.include_router(admin_orders.router)
api_router.include_router(admin_abandoned_checkouts.router)
api_router.include_router(admin_customers.router)
api_router.include_router(admin_coupons.router)
api_router.include_router(admin_inventory.router)
api_router.include_router(admin_reviews.router)
api_router.include_router(admin_content.router)
api_router.include_router(admin_settings.router)
api_router.include_router(admin_analytics.router)
api_router.include_router(admin_newsletter.router)
api_router.include_router(admin_media.router)
api_router.include_router(admin_notifications.router)
api_router.include_router(admin_search.router)
api_router.include_router(admin_contact.router)
api_router.include_router(admin_roles.router)
api_router.include_router(admin_staff.router)
api_router.include_router(admin_blog.router)
