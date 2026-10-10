import { Link } from 'react-router-dom';
import { FREE_SHIPPING_MESSAGE } from '@/utils/constants';

export default function TopBar() {
  return (
    <div className="bg-brand-black text-white py-2">
      <div className="container-custom flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <Link to="/page/faq" className="hover:underline">Help</Link>
          <Link to="/track-order" className="hover:underline">Track Order</Link>
        </div>
        <p className="text-xs font-medium tracking-wide uppercase text-center flex-1 sm:flex-none">
          {FREE_SHIPPING_MESSAGE}
        </p>
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <Link to="/about" className="hover:underline">About Us</Link>
          <Link to="/contact" className="hover:underline">Contact</Link>
        </div>
      </div>
    </div>
  );
}
