import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { couponApi } from '@/api/cart.api';
import { useCartStore } from '@/store/cartStore';
import { couponErrorMessage, useCoupon } from '@/hooks/useCoupon';
import { formatPrice } from '@/utils/formatters';
import { trackEvent } from '@/utils/analytics';

/** Promo code entry for the bag and checkout. A code is only kept once the server accepts it. */
export default function CouponField() {
  const queryClient = useQueryClient();
  const setCoupon = useCartStore((s) => s.setCoupon);
  const subtotal = useCartStore((s) => s.subtotal());
  const { code, coupon, error } = useCoupon();
  const [input, setInput] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    const entered = input.trim().toUpperCase();
    if (!entered || isApplying) return;
    setIsApplying(true);
    setApplyError(null);
    try {
      const result = await couponApi.validate(entered, subtotal);
      queryClient.setQueryData(['coupon', result.code, subtotal], result);
      setCoupon(result.code);
      setInput('');
      trackEvent('apply_coupon', { coupon: result.code });
      toast.success(`${result.code} applied: ${formatPrice(result.discount_amount)} off`);
    } catch (err) {
      setApplyError(couponErrorMessage(err));
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemove = () => {
    trackEvent('remove_coupon', { coupon: code });
    setCoupon(null);
    toast.success('Promo code removed');
  };

  if (code) {
    return (
      <div>
        <div className="flex items-center justify-between bg-white border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-5 h-5 bg-brand-black text-white text-xs font-bold flex items-center justify-center flex-shrink-0">%</span>
            <span className="text-sm font-bold truncate">{code}</span>
            {coupon && (
              <span className="text-sm text-green-700 flex-shrink-0">-{formatPrice(coupon.discount_amount)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-bold text-gray-500 hover:text-brand-accent transition-colors uppercase tracking-wider"
          >
            Remove
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-2" role="alert">
            {error}. The code isn't applied to this order.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-0">
        <input
          type="text"
          aria-label="Promo code"
          autoComplete="off"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setApplyError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApply();
            }
          }}
          placeholder="Promo code"
          aria-invalid={!!applyError}
          aria-describedby={applyError ? 'coupon-error' : undefined}
          className="flex-1 min-w-0 border border-gray-300 border-r-0 px-4 py-3 text-sm uppercase placeholder:normal-case focus:outline-none focus:border-brand-black transition-colors"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying}
          className="bg-brand-black text-white px-5 py-3 text-xs font-heading font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {isApplying ? 'Checking' : 'Apply'}
        </button>
      </div>
      {applyError && (
        <p id="coupon-error" className="text-xs text-red-600 mt-2" role="alert">
          {applyError}
        </p>
      )}
    </div>
  );
}
