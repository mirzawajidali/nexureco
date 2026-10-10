import { useMemo } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useCoupon } from './useCoupon';
import { bundleDiscount } from '@/utils/bundles';

/**
 * The bag's discount as checkout will charge it: the bundle deal or the promo code, whichever saves
 * more (they never stack; backend order_service.place_order applies the same rule).
 */
export function useBagDiscount() {
  const items = useCartStore((s) => s.items);
  const coupon = useCoupon();
  const bundle = useMemo(() => bundleDiscount(items), [items]);

  // On a tie the code is kept, like the server (which then records the code's use)
  const bundleWins = bundle.discount > coupon.discount;
  return {
    ...coupon,
    bundle,
    /** What comes off the subtotal */
    discount: bundleWins ? bundle.discount : coupon.discount,
    source: bundleWins ? ('bundle' as const) : coupon.discount > 0 ? ('coupon' as const) : null,
    /** A valid code was entered but the bundle saves more, so the code isn't used */
    couponOutdone: bundleWins && !!coupon.coupon,
    /** The code to send with the order: only when it's the discount being applied */
    appliedCouponCode: bundleWins ? undefined : coupon.coupon?.code,
  };
}
