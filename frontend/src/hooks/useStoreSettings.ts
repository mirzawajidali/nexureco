import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@/api/store.api';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST } from '@/utils/constants';
import { formatPrice } from '@/utils/formatters';

/** 0 means every order ships free */
export const freeShippingMessage = (threshold: number) =>
  threshold > 0 ? `Free shipping on orders of ${formatPrice(threshold)} or more` : 'Free shipping on all orders';

/**
 * The shipping rule and announcement the owner sets in Admin > Settings (checkout charges by the same
 * values on the server). Until they load, the coded defaults are used.
 */
export function useStoreSettings() {
  const { data } = useQuery({
    queryKey: ['store', 'settings'],
    queryFn: storeApi.settings,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const freeShippingThreshold = data?.free_shipping_threshold ?? FREE_SHIPPING_THRESHOLD;
  const shippingCost = data?.standard_shipping_cost ?? STANDARD_SHIPPING_COST;
  return {
    freeShippingThreshold,
    shippingCost,
    /** Same rule as the server: free from the threshold, on the subtotal before discounts */
    shippingFor: (subtotal: number) => (subtotal >= freeShippingThreshold ? 0 : shippingCost),
    freeShippingMessage: freeShippingMessage(freeShippingThreshold),
    /** Top-bar text: the owner's announcement, or the free-shipping line */
    announcement: data?.announcement_text?.trim() || freeShippingMessage(freeShippingThreshold),
  };
}
