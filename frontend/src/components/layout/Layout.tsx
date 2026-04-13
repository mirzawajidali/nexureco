import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Header from './Header';
import Footer from './Footer';
import MobileMenu from './MobileMenu';
import CartDrawer from '@/components/cart/CartDrawer';
import Chatbot from '@/components/chatbot/Chatbot';

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <MobileMenu />
      <CartDrawer />
      <Chatbot />
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Promo banner — above footer on every page */}
      <section className="bg-[#0e4d3c] text-white">
        <div className="container-custom py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-heading font-bold uppercase tracking-wide text-base sm:text-lg text-center sm:text-left">
            Buy 5 T-Shirts & get free delivery
          </p>
          <Link
            to="/category/t-shirts"
            className="inline-flex items-center gap-2 bg-white text-brand-black px-6 py-3 font-heading font-bold uppercase text-sm tracking-wider hover:bg-gray-100 transition-colors"
          >
            Shop now
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
