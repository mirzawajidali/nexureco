import client from './client';
import type { CouponCheck } from '@/types/coupon';

export const couponApi = {
  /** Works for guests and signed-in shoppers; checkout validates the code again. */
  validate: (code: string, subtotal: number) =>
    client.post<CouponCheck>('/coupons/validate', { code, subtotal }).then((res) => res.data),
};

export const cartApi = {
  get: () => client.get('/cart/'),
  addItem: (data: { product_id: number; variant_id?: number | null; quantity: number }) =>
    client.post('/cart/items', data),
  updateItem: (itemId: number, quantity: number) =>
    client.put(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: number) => client.delete(`/cart/items/${itemId}`),
  clear: () => client.delete('/cart/'),
  applyCoupon: (code: string) => client.post('/cart/apply-coupon', { code }),
};

export const orderApi = {
  checkout: (data: {
    guest_email?: string;
    items: { product_id: number; variant_id: number | null; quantity: number }[];
    shipping_first_name: string;
    shipping_last_name: string;
    shipping_phone: string;
    shipping_address1: string;
    shipping_address2?: string;
    shipping_city: string;
    shipping_state: string;
    shipping_postal_code: string;
    shipping_country?: string;
    customer_note?: string;
    coupon_code?: string;
    /** Saved-checkout id (utils/checkoutDraft.ts); the order marks it recovered */
    draft_token?: string;
    /** 'payfast': the order is paid on PayFast's page right after it's placed */
    payment_method?: 'cod' | 'payfast';
  }) => client.post('/orders/checkout', data),
  list: (page = 1) => client.get('/orders/', { params: { page } }),
  get: (orderNumber: string) => client.get(`/orders/${orderNumber}`),
  cancel: (orderNumber: string) => client.post(`/orders/${orderNumber}/cancel`),
  track: (orderNumber: string, email?: string) =>
    client.post('/orders/track', { order_number: orderNumber, ...(email ? { email } : {}) }),
  /** Order behind a confirmation link (sent by the store on WhatsApp) */
  getToConfirm: (token: string) => client.get<OrderToConfirm>('/orders/confirm', { params: { token } }),
  /** Customer confirms their cash-on-delivery order */
  confirm: (token: string) => client.post<OrderToConfirm>('/orders/confirm', { token }),
};

export const paymentsApi = {
  /** "cod", plus "payfast" when online payment is configured */
  methods: () => client.get<{ methods: string[] }>('/payments/methods'),
  /** Form to post to PayFast's payment page for a just-placed online-payment order */
  payfastStart: (orderNumber: string) =>
    client.post<{ action: string; fields: Record<string, string> }>('/payments/payfast/start', {
      order_number: orderNumber,
    }),
};

/** Leave for PayFast's hosted payment page (a normal form POST, as PayFast requires). */
export async function goToPayFast(orderNumber: string) {
  const { data } = await paymentsApi.payfastStart(orderNumber);
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = data.action;
  for (const [name, value] of Object.entries(data.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export interface OrderToConfirm {
  order_number: string;
  status: string;
  first_name: string | null;
  city: string | null;
  items: { name: string; variant_info: string | null; quantity: number; total_price: number }[];
  shipping_cost: number;
  discount_amount: number;
  total: number;
}

export const chatApi = {
  send: (message: string, history: { role: string; content: string }[]) =>
    client.post('/chat/', { message, history }),
};
