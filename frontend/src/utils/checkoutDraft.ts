import client from '@/api/client';
import type { CartItemLocal } from '@/store/cartStore';

/**
 * The bag of a checkout in progress is saved on the server (backend abandoned_checkout_service) under a
 * random id kept in this browser, so the store can send a WhatsApp reminder with a link (/bag/<id>) that
 * restores it. Placing the order marks it recovered.
 */
const KEY = 'nexure-checkout-draft';

export function checkoutDraftToken(): string {
  try {
    let token = localStorage.getItem(KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(KEY, token);
    }
    return token;
  } catch {
    // Storage blocked (private mode): a fresh id still saves this checkout, it just won't be reused
    return crypto.randomUUID();
  }
}

export function clearCheckoutDraftToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Fire-and-forget: a failure here must never get in the way of checking out. */
export function saveCheckoutDraft(
  token: string,
  data: { first_name?: string; phone: string; email?: string; city?: string },
  items: CartItemLocal[],
) {
  client
    .put(`/checkout-drafts/${token}`, {
      ...data,
      items: items.map((i) => ({ product_id: i.productId, variant_id: i.variantId, quantity: i.quantity })),
    })
    .catch(() => {});
}

export interface RestoredLine {
  product_id: number;
  variant_id: number | null;
  quantity: number;
  name: string;
  slug: string;
  variant_info: string | null;
  price: number;
  image: string | null;
}

export const restoreCheckoutDraft = (token: string) =>
  client.get<{ items: RestoredLine[] }>(`/checkout-drafts/${token}`).then((res) => res.data.items);
