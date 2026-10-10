/**
 * Bundle deal: any BUNDLE_SIZE tees for BUNDLE_PRICE. Mirrors backend/app/services/bundle_service.py,
 * which is what checkout actually charges — keep the two in sync.
 */
import { formatPrice } from './formatters';

export const BUNDLE_SIZE = 3;
export const BUNDLE_PRICE = 3500;
export const BUNDLE_LABEL = `Any ${BUNDLE_SIZE} tees for ${formatPrice(BUNDLE_PRICE)}`;

export interface BundleResult {
  /** Complete bundles in the bag */
  sets: number;
  /** Total saving across all sets */
  discount: number;
  /** How many more tees complete the next bundle */
  itemsToNextSet: number;
}

/**
 * Saving for the bag's items. The most expensive units are grouped first, and a set is only
 * discounted when the bundle price is lower than its normal total.
 */
export function bundleDiscount(lines: { price: number; quantity: number }[]): BundleResult {
  const prices = lines.flatMap((l) => Array<number>(l.quantity).fill(l.price)).sort((a, b) => b - a);
  const sets = Math.floor(prices.length / BUNDLE_SIZE);
  let discount = 0;
  for (let i = 0; i < sets; i++) {
    const groupTotal = prices.slice(i * BUNDLE_SIZE, (i + 1) * BUNDLE_SIZE).reduce((sum, p) => sum + p, 0);
    discount += Math.max(0, groupTotal - BUNDLE_PRICE);
  }
  const remainder = prices.length % BUNDLE_SIZE;
  return {
    sets,
    discount: Math.round(discount * 100) / 100,
    itemsToNextSet: prices.length ? BUNDLE_SIZE - remainder : BUNDLE_SIZE,
  };
}
