import { SparklesIcon } from '@heroicons/react/24/outline';
import { BUNDLE_LABEL, type BundleResult } from '@/utils/bundles';
import { formatPrice } from '@/utils/formatters';

/** "Bundle applied" or "Add 1 more tee to get 3 for Rs. 3,500", for the bag, cart and checkout. */
export default function BundleNotice({
  bundle,
  applied,
  couponOutdone = false,
  className = '',
}: {
  bundle: BundleResult;
  /** The bundle is the discount being charged (it beat any promo code) */
  applied: boolean;
  couponOutdone?: boolean;
  className?: string;
}) {
  const more = bundle.itemsToNextSet;
  return (
    <div className={`flex items-start gap-2 text-sm ${className}`} role="status" aria-live="polite">
      <SparklesIcon className="h-5 w-5 flex-shrink-0 text-sale" aria-hidden="true" />
      <p>
        {applied ? (
          <>
            <strong>{BUNDLE_LABEL}</strong> applied: you save <strong>{formatPrice(bundle.discount)}</strong>.
            {couponOutdone && ' (Better than your promo code, so the code isn\'t used.)'}
            {bundle.sets > 0 && more < 3 && ` Add ${more} more for another bundle.`}
          </>
        ) : (
          <>
            <strong>{BUNDLE_LABEL}</strong>: add {more} more tee{more > 1 ? 's' : ''} to {bundle.sets > 0 ? 'complete another bundle' : 'get the bundle price'}.
          </>
        )}
      </p>
    </div>
  );
}
