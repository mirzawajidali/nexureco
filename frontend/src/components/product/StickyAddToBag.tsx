import { useEffect, useState, type RefObject } from 'react';
import { clsx } from 'clsx';
import { formatPrice } from '@/utils/formatters';

interface StickyAddToBagProps {
  /** The page's own Add to Bag button: the bar shows only while that button is out of view */
  targetRef: RefObject<HTMLElement>;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Add to Bag bar fixed to the bottom of the screen whenever the product page's own button is
 * scrolled out of view. While shown it sets html.has-sticky-bar, which lifts the chat button
 * (and anything else using --sticky-bar-height) above it.
 */
export default function StickyAddToBag({
  targetRef,
  name,
  price,
  compareAtPrice,
  label,
  disabled = false,
  onClick,
}: StickyAddToBagProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);

  useEffect(() => {
    document.documentElement.classList.toggle('has-sticky-bar', visible);
    return () => document.documentElement.classList.remove('has-sticky-bar');
  }, [visible]);

  if (!visible) return null;

  const onSale = !!compareAtPrice && compareAtPrice > price;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)] animate-slide-in-up">
      <div className="container-custom h-16 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-600 truncate">{name}</p>
          <p className="text-sm font-bold">
            <span className={clsx(onSale && 'text-sale')}>{formatPrice(price)}</span>
            {onSale && (
              <span className="ml-2 font-normal text-gray-600 line-through">{formatPrice(compareAtPrice)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={clsx(
            'h-12 px-6 sm:px-10 text-sm font-bold uppercase tracking-wider transition-colors flex-shrink-0',
            disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-brand-black text-white hover:bg-gray-800',
          )}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
