import { FREE_SHIPPING_MESSAGE } from '@/utils/constants';

// Help, order tracking and contact links are in the header's utility row (desktop) and the mobile menu
export default function TopBar() {
  return (
    <div className="bg-brand-black text-white py-1.5">
      <div className="container-custom">
        <p className="text-xs font-medium tracking-wide uppercase text-center">{FREE_SHIPPING_MESSAGE}</p>
      </div>
    </div>
  );
}
