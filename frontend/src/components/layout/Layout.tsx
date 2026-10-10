import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Header from './Header';
import Footer from './Footer';
import MobileMenu from './MobileMenu';
import CartDrawer from '@/components/cart/CartDrawer';
import Chatbot from '@/components/chatbot/Chatbot';
import { useAuthStore } from '@/store/authStore';
import { usePageViews } from '@/hooks/useAnalytics';
import { setAnalyticsUserId } from '@/utils/analytics';
import { Helmet } from 'react-helmet-async';
import { APP_DESCRIPTION, DEFAULT_DESCRIPTION, FREE_SHIPPING_MESSAGE, SITE_NAME, SITE_URL } from '@/utils/constants';

export default function Layout() {
  const { pathname } = useLocation();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // GA4: storefront page views + signed-in user id (admin routes use AdminLayout, so aren't tracked)
  usePageViews();
  useEffect(() => {
    setAnalyticsUserId(userId);
  }, [userId]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Site-wide defaults; pages set their own <title> (without the brand) and description */}
      <Helmet titleTemplate={`%s | ${SITE_NAME}`} defaultTitle={`${SITE_NAME} | ${APP_DESCRIPTION}`}>
        <meta name="description" content={DEFAULT_DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}${pathname}`} />
      </Helmet>
      {/* Keyboard users can jump past the header; focusing <main> avoids changing the URL hash */}
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-brand-black focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <TopBar />
      <Header />
      <MobileMenu />
      <CartDrawer />
      <Chatbot />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      {/* Promo banner — above footer on every page */}
      <section className="bg-[#0e4d3c] text-white">
        <div className="container-custom py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-heading font-bold uppercase tracking-wide text-base sm:text-lg text-center sm:text-left">
            {FREE_SHIPPING_MESSAGE}
          </p>
          <Link
            to="/category/men"
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
