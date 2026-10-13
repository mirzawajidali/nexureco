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
import { DEFAULT_DESCRIPTION, HOME_TITLE, SITE_URL, TITLE_SUFFIX } from '@/utils/constants';
import { useStoreSettings } from '@/hooks/useStoreSettings';

export default function Layout() {
  const { pathname } = useLocation();
  const userId = useAuthStore((s) => s.user?.id);
  const { freeShippingMessage } = useStoreSettings();

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
      {/* Site-wide defaults; pages set their own <title> ("[keywords]", the template adds "| Nexure CO Pakistan"),
          description and, for pages that shouldn't be indexed, robots */}
      <Helmet titleTemplate={`%s | ${TITLE_SUFFIX}`} defaultTitle={`${HOME_TITLE} | ${TITLE_SUFFIX}`}>
        <meta name="description" content={DEFAULT_DESCRIPTION} />
        <meta name="robots" content="index, follow" />
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
            {freeShippingMessage}
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
