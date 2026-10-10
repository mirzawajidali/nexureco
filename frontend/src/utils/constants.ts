// The one brand name used everywhere: UI copy, page titles, structured data
export const SITE_NAME = 'Nexure CO';
export const APP_NAME = SITE_NAME;
export const APP_DESCRIPTION = 'Premium Fashion & Apparel';
// Canonical site origin
export const SITE_URL = 'https://nexureco.com';
export const DEFAULT_DESCRIPTION =
  'Nexure CO - premium fashion & apparel. Shop new arrivals, best sellers and everyday essentials.';
export const STORE_EMAIL = 'support@nexureco.com';
export const STORE_PHONE = '+92 316 7936302';
// Store WhatsApp (floating button, "Order on WhatsApp"); see utils/whatsapp.ts
export const WHATSAPP_NUMBER = STORE_PHONE;
export const STORE_ADDRESS = 'Nexure Co, Ferozepur Road, Ichhra, Lahore';
export const STORE_HOURS = 'Mon - Sat, 10am - 8pm PKT';
// Mirrored in backend/app/core/store.py (checkout charges, chatbot, structured data) — keep in sync
export const FREE_SHIPPING_THRESHOLD = 5000;
export const STANDARD_SHIPPING_COST = 200;
// Returns/exchanges accepted within this many days of delivery (also on the Shipping & Returns page)
export const RETURN_WINDOW_DAYS = 7;
export const RETURN_POLICY_SUMMARY =
  `Returns and exchanges are accepted within ${RETURN_WINDOW_DAYS} days of delivery. Items must be unworn, unwashed, ` +
  'and in their original packaging. Refunds are processed within 5-7 business days.';
// Site-wide free-shipping message (top bar, promo banner)
export const FREE_SHIPPING_MESSAGE = `Free shipping on orders of Rs. ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-PK')} or more`;
// SEO (Adidas-style): titles are "[primary] and [secondary keyword] | Nexure CO Pakistan" (under 60 chars),
// descriptions 140-160 chars starting with a verb. The same text is in backend/app/services/seo_service.py
// (server-rendered head) — keep them identical.
export const SITE_MARKET = 'Pakistan';
export const TITLE_SUFFIX = `${SITE_NAME} ${SITE_MARKET}`;
export const HOME_TITLE = "Men's T-Shirts and Oversized Tees";
// The homepage H1 (visually hidden: the hero headline is admin-managed banner copy)
export const HOME_H1 = "Men's T-Shirts and Oversized Tees in Pakistan";
export const HOME_DESCRIPTION =
  "Explore men's T-shirts at Nexure CO: oversized, regular fit and embroidered tees in 100% cotton. " +
  'Cash on delivery across Pakistan, free shipping from Rs. 5,000.';
export const PAGE_SEO = {
  about: {
    title: 'About Us and Our Story',
    description:
      'Discover Nexure CO, a Lahore T-shirt brand making premium 100% cotton tees in oversized, regular fit and ' +
      'embroidered styles, delivered across Pakistan.',
  },
  contact: {
    title: 'Contact Us and Customer Support',
    description: `Contact ${SITE_NAME} for help with orders, delivery, returns and sizing. Call ${STORE_PHONE} or email ${STORE_EMAIL}, ${STORE_HOURS}.`,
  },
  sizeGuide: {
    title: 'T-Shirt Size Guide and Fit Chart',
    description:
      'Find your T-shirt size with the Nexure CO size guide: chest and length charts for regular fit and oversized ' +
      'tees, plus easy tips for measuring at home.',
  },
};
// Official social profiles (footer links and Organization structured data)
export const SOCIAL_PROFILES = [
  'https://instagram.com/nexureco',
  'https://tiktok.com/@nexureco',
  'https://facebook.com/nexure',
];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'badge-warning',
  confirmed: 'badge-info',
  processing: 'badge-info',
  shipped: 'badge-info',
  delivered: 'badge-success',
  cancelled: 'badge-error',
  returned: 'badge-error',
};
