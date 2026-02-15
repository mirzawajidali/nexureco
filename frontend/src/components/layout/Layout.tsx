import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
      <Footer />
    </div>
  );
}
