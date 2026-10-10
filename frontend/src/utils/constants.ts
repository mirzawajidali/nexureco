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
// Site-wide free-shipping message (top bar, promo banner, marquee)
export const FREE_SHIPPING_MESSAGE = `Free shipping on orders over Rs. ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-PK')}`;
// Homepage meta description; same text as HOME_DESCRIPTION in backend/app/services/seo_service.py
export const HOME_DESCRIPTION =
  `Shop premium 100% cotton T-shirts at ${SITE_NAME}: oversized, regular fit and embroidered tees. ` +
  `Cash on delivery across Pakistan, free shipping over Rs. ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-PK')}.`;

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
