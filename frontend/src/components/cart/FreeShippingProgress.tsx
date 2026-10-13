import { TruckIcon } from '@heroicons/react/24/outline';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { formatPrice } from '@/utils/formatters';

/**
 * "Add Rs. X more for free delivery" with a progress bar. Uses the same rule as checkout
 * (free shipping when the subtotal reaches the threshold set in Admin > Settings).
 */
export default function FreeShippingProgress({ subtotal, className = '' }: { subtotal: number; className?: string }) {
  const { freeShippingThreshold } = useStoreSettings();
  const remaining = freeShippingThreshold - subtotal;
  const percent = freeShippingThreshold > 0 ? Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100)) : 100;

  return (
    <div className={className} role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-sm mb-2">
        <TruckIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
        {remaining > 0 ? (
          <span>
            Add <strong>{formatPrice(remaining)}</strong> more for <strong>free delivery</strong>
          </span>
        ) : (
          <strong>You've unlocked free delivery!</strong>
        )}
      </p>
      <div className="h-1.5 bg-gray-200 overflow-hidden" aria-hidden="true">
        <div
          className={`h-full transition-all duration-500 ${remaining > 0 ? 'bg-brand-black' : 'bg-success'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
