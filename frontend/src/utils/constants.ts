export const APP_NAME = 'nexure';
export const APP_DESCRIPTION = 'Premium Fashion & Apparel';
export const STORE_EMAIL = 'support@nexure.com';
export const STORE_PHONE = '+92 300 1234567';
export const STORE_ADDRESS = '123 Fashion Street, Lahore, Pakistan';
export const STORE_HOURS = 'Mon - Sat, 10am - 8pm PKT';
export const FREE_SHIPPING_THRESHOLD = 5000;
export const STANDARD_SHIPPING_COST = 200;

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
