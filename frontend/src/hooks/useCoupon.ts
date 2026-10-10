import { useQuery } from '@tanstack/react-query';
import { couponApi } from '@/api/cart.api';
import { useCartStore } from '@/store/cartStore';

export function couponErrorMessage(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'This code could not be applied';
}

/**
 * The bag's promo code checked against the current subtotal. Re-checked whenever the bag changes, so a
 * percentage discount follows the subtotal and a code that falls below its minimum stops applying.
 */
export function useCoupon() {
  const code = useCartStore((s) => s.couponCode);
  const subtotal = useCartStore((s) => s.subtotal());

  const query = useQuery({
    queryKey: ['coupon', code, subtotal],
    queryFn: () => couponApi.validate(code!, subtotal),
    enabled: !!code && subtotal > 0,
    staleTime: 60 * 1000,
    retry: false,
    placeholderData: (previous) => previous,
  });

  const valid = !!code && !!query.data && !query.isError;
  return {
    code,
    coupon: valid ? query.data : undefined,
    discount: valid ? query.data!.discount_amount : 0,
    error: code && query.isError ? couponErrorMessage(query.error) : null,
    isChecking: query.isFetching,
  };
}
