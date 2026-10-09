/**
 * Google Analytics 4 (gtag.js) event helpers.
 *
 * The Google tag is loaded in index.html with `send_page_view: false`; page views
 * are sent on route change by `usePageViews` (hooks/useAnalytics.ts).
 * Every helper is a no-op when gtag is unavailable, so tracking never breaks the UI.
 *
 * Event reference: https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */
import type { CartItemLocal } from '@/store/cartStore';
import type { Order } from '@/types/order';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const CURRENCY = 'PKR';

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  price?: number;
  quantity?: number;
  item_category?: string;
  item_variant?: string;
  index?: number;
}

export interface ItemList {
  id: string;
  name: string;
}

export interface Promotion {
  promotion_id: string;
  promotion_name: string;
  creative_slot?: string;
}

type EventParams = Record<string, unknown>;

export function trackEvent(name: string, params: EventParams = {}) {
  // Dev events carry debug_mode so they show up in GA4 DebugView
  window.gtag?.('event', name, import.meta.env.DEV ? { ...params, debug_mode: true } : params);
}

let currentUserId: string | null = null;

/** Ties subsequent events to a signed-in customer; pass null on sign-out. */
export function setAnalyticsUserId(id: number | null | undefined) {
  const next = id == null ? null : String(id);
  if (next === currentUserId) return;
  currentUserId = next;
  window.gtag?.('set', { user_id: next });
}

/* ── Item builders ── */

interface ProductLike {
  id: number;
  name: string;
  base_price: number;
  category_name?: string | null;
}

export function productToItem(product: ProductLike, extra: Partial<AnalyticsItem> = {}): AnalyticsItem {
  return {
    item_id: String(product.id),
    item_name: product.name,
    price: product.base_price,
    item_category: product.category_name ?? undefined,
    ...extra,
  };
}

export function cartLineToItem(line: CartItemLocal, quantity = line.quantity): AnalyticsItem {
  return {
    item_id: String(line.productId),
    item_name: line.name,
    price: line.price,
    quantity,
    item_variant: line.variantInfo,
  };
}

const itemsValue = (items: AnalyticsItem[]) =>
  items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0);

function trackItems(name: string, items: AnalyticsItem[], params: EventParams = {}) {
  trackEvent(name, { currency: CURRENCY, value: itemsValue(items), items, ...params });
}

/* ── Page & list events ── */

export function trackPageView(pageLocation: string, pageTitle: string) {
  trackEvent('page_view', { page_location: pageLocation, page_title: pageTitle });
}

export function trackViewItemList(items: AnalyticsItem[], list: ItemList) {
  trackEvent('view_item_list', { item_list_id: list.id, item_list_name: list.name, items });
}

export function trackSelectItem(item: AnalyticsItem, list?: ItemList) {
  trackEvent('select_item', { item_list_id: list?.id, item_list_name: list?.name, items: [item] });
}

/** Custom event: one apply_filter per changed filter (sort, price…) on a listing page. */
export function trackFilters(filters: Record<string, unknown>, list: ItemList) {
  Object.entries(filters).forEach(([name, value]) => {
    if (name === 'page' || value === undefined || value === null) return;
    trackEvent('apply_filter', {
      filter_name: name,
      filter_value: String(value),
      item_list_id: list.id,
      item_list_name: list.name,
    });
  });
}

export const trackSearch = (searchTerm: string) => trackEvent('search', { search_term: searchTerm });

export const trackViewPromotion = (promotion: Promotion) => trackEvent('view_promotion', { ...promotion });
export const trackSelectPromotion = (promotion: Promotion) => trackEvent('select_promotion', { ...promotion });

/* ── Ecommerce funnel ── */

export const trackViewItem = (items: AnalyticsItem[]) => trackItems('view_item', items);
export const trackAddToCart = (items: AnalyticsItem[]) => trackItems('add_to_cart', items);
export const trackRemoveFromCart = (items: AnalyticsItem[]) => trackItems('remove_from_cart', items);
export const trackViewCart = (items: AnalyticsItem[]) => trackItems('view_cart', items);
export const trackAddToWishlist = (items: AnalyticsItem[]) => trackItems('add_to_wishlist', items);
/** Custom event — GA4 has no recommended counterpart to add_to_wishlist. */
export const trackRemoveFromWishlist = (items: AnalyticsItem[]) => trackItems('remove_from_wishlist', items);

export const trackBeginCheckout = (items: AnalyticsItem[], coupon?: string | null) =>
  trackItems('begin_checkout', items, { coupon: coupon ?? undefined });

export const trackAddShippingInfo = (items: AnalyticsItem[], shippingTier: string, coupon?: string | null) =>
  trackItems('add_shipping_info', items, { shipping_tier: shippingTier, coupon: coupon ?? undefined });

export const trackAddPaymentInfo = (items: AnalyticsItem[], paymentType: string, coupon?: string | null) =>
  trackItems('add_payment_info', items, { payment_type: paymentType, coupon: coupon ?? undefined });

export function trackPurchase(order: Order) {
  trackEvent('purchase', {
    transaction_id: order.order_number,
    currency: CURRENCY,
    // GA4 convention: value excludes shipping and tax, which are sent separately
    value: order.subtotal - order.discount_amount,
    shipping: order.shipping_cost,
    tax: order.tax_amount,
    coupon: order.coupon_code ?? undefined,
    items: order.items.map((item) => ({
      item_id: String(item.product_id ?? item.sku ?? item.id),
      item_name: item.product_name,
      item_variant: item.variant_info ?? undefined,
      price: item.unit_price,
      quantity: item.quantity,
    })),
  });
}

/* ── Account & leads ── */

export const trackLogin = (method = 'email') => trackEvent('login', { method });
export const trackSignUp = (method = 'email') => trackEvent('sign_up', { method });
export const trackGenerateLead = (leadSource: string) => trackEvent('generate_lead', { lead_source: leadSource });
