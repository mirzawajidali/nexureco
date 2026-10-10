import { Link } from 'react-router-dom';
import { FREE_SHIPPING_MESSAGE } from '@/utils/constants';

export default function TopBar() {
  return (
    <div className="bg-brand-black text-white py-1">
      <div className="container-custom flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <Link to="/page/faq" className="inline-flex items-center min-h-6 px-1 hover:underline">Help</Link>
          <Link to="/track-order" className="inline-flex items-center min-h-6 px-1 hover:underline">Track Order</Link>
        </div>
        <p className="text-xs font-medium tracking-wide uppercase text-center flex-1 sm:flex-none">
          {FREE_SHIPPING_MESSAGE}
        </p>
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <Link to="/about" className="inline-flex items-center min-h-6 px-1 hover:underline">About Us</Link>
          <Link to="/contact" className="inline-flex items-center min-h-6 px-1 hover:underline">Contact</Link>
        </div>
      </div>
    </div>
  );
}
