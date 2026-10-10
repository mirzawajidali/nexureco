import { BanknotesIcon, TruckIcon, ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline';
import { FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS } from '@/utils/constants';
import { formatPrice } from '@/utils/formatters';

// Store promises shown next to Add to Bag. Every one must match checkout and the Shipping & Returns page.
const BADGES = [
  { Icon: BanknotesIcon, title: 'Cash on delivery', text: 'Pay when your order arrives' },
  { Icon: TruckIcon, title: 'Free shipping', text: `On orders of ${formatPrice(FREE_SHIPPING_THRESHOLD)} or more` },
  { Icon: ArrowPathIcon, title: `${RETURN_WINDOW_DAYS}-day exchange`, text: 'Easy size or colour swaps' },
  { Icon: ClockIcon, title: 'Fast delivery', text: '3-5 business days across Pakistan' },
];

export default function TrustBadges() {
  return (
    <ul className="grid grid-cols-2 gap-px bg-gray-200 border border-gray-200" aria-label="Shopping with us">
      {BADGES.map(({ Icon, title, text }) => (
        <li key={title} className="bg-white flex items-start gap-2.5 p-3">
          <Icon className="w-5 h-5 flex-shrink-0 text-brand-black" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-brand-black">{title}</p>
            <p className="text-xs text-gray-600 leading-snug">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
