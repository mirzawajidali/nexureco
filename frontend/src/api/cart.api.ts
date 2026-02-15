import client from './client';

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
  }) => client.post('/orders/checkout', data),
  list: (page = 1) => client.get('/orders/', { params: { page } }),
  get: (orderNumber: string) => client.get(`/orders/${orderNumber}`),
  cancel: (orderNumber: string) => client.post(`/orders/${orderNumber}/cancel`),
  track: (orderNumber: string, email: string) =>
    client.post('/orders/track', { order_number: orderNumber, email }),
};

export const chatApi = {
  send: (message: string, history: { role: string; content: string }[]) =>
    client.post('/chat/', { message, history }),
};
