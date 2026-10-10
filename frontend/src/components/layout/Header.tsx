import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  MagnifyingGlassIcon,
  UserIcon,
  HeartIcon,
  ShoppingBagIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useUIStore } from '@/store/uiStore';
import SearchSuggestions from '@/components/search/SearchSuggestions';
import BrandLogo from '@/components/ui/BrandLogo';
import MegaMenu from '@/components/layout/MegaMenu';
import { getHeroBanners } from '@/api/pages.api';
import { UTILITY_LINKS, megaColumns, useHeaderNav, type NavLink } from '@/utils/navigation';
import { cartLineToItem, trackViewCart } from '@/utils/analytics';

const navKey = (link: NavLink) => link.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuUsed, setMenuUsed] = useState(false);
  const hoverTimer = useRef<number>();
  // Set while Esc hands focus back to a menu's link, so that focus doesn't reopen the menu
  const refocusing = useRef(false);
  const { pathname } = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const navLinks = useHeaderNav();

  // Campaign tiles in the mega menu: the hero slides, fetched the first time a menu opens
  const { data: promos } = useQuery({
    queryKey: ['banners', 'hero'],
    queryFn: getHeroBanners,
    staleTime: 5 * 60 * 1000,
    enabled: menuUsed,
  });

  const cartItemCount = useCartStore((s) => s.itemCount());
  const wishlistCount = useWishlistStore((s) => s.productIds.length);
  const { toggleMobileMenu, isMobileMenuOpen, toggleSearch, isSearchOpen, setSearchOpen } = useUIStore();

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const SCROLL_THRESHOLD = 10;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;

      setIsScrolled(currentY > 40);

      // Only toggle after a small threshold to avoid jitter
      if (Math.abs(delta) > SCROLL_THRESHOLD) {
        setIsHidden(delta > 0 && currentY > 80);
        lastScrollY = currentY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // A new page closes the menu
  useEffect(() => setOpenMenu(null), [pathname]);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const showMenu = (key: string | null, delay: number) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      setOpenMenu(key);
      if (key) setMenuUsed(true);
    }, delay);
  };

  const isActive = (link: NavLink) => !!link.href && (pathname === link.href || pathname.startsWith(`${link.href}/`));

  const openCart = () => {
    const cart = useCartStore.getState();
    if (!cart.isCartOpen && cart.items.length) {
      trackViewCart(cart.items.map((i) => cartLineToItem(i)));
    }
    cart.toggleCart();
  };

  const countBadge = (count: number) =>
    count > 0 && (
      <span className="absolute -top-0.5 -right-0.5 bg-brand-black text-white text-xs font-bold min-w-5 h-5 px-1 flex items-center justify-center">
        {count > 99 ? '99+' : count}
      </span>
    );

  const accountLink = (className: string) => (
    <Link
      to={isAuthenticated ? '/account/profile' : '/login'}
      className={clsx('p-2 hover:bg-gray-100 transition-colors', className)}
      aria-label="Account"
    >
      <UserIcon className="h-6 w-6" />
    </Link>
  );

  const wishlistLink = (className: string) => (
    <Link to="/wishlist" className={clsx('p-2 hover:bg-gray-100 transition-colors relative', className)} aria-label="Wishlist">
      <HeartIcon className="h-6 w-6" />
      {countBadge(wishlistCount)}
    </Link>
  );

  const cartButton = (
    <button onClick={openCart} className="p-2 hover:bg-gray-100 transition-colors relative" aria-label="Cart">
      <ShoppingBagIcon className="h-6 w-6" />
      {countBadge(cartItemCount)}
    </button>
  );

  const searchToggle = (className: string) => (
    <button
      onClick={toggleSearch}
      className={clsx('p-2 hover:bg-gray-100 transition-colors', className)}
      aria-label="Search"
      aria-expanded={isSearchOpen}
    >
      <MagnifyingGlassIcon className="h-6 w-6" />
    </button>
  );

  return (
    <header
      className={`sticky top-0 z-40 bg-white transition-all duration-300 ${
        isScrolled ? 'shadow-md' : ''
      } ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}
    >
      {/* The mega menus are positioned against this box, so they span the full width under the header */}
      <div className="relative border-b border-gray-200">
        {/* Small screens: menu button, logo, icons */}
        <div className="container-custom flex lg:hidden items-center justify-between h-16">
          <button
            onClick={toggleMobileMenu}
            className="p-2 -ml-2 hover:bg-gray-100"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <BrandLogo size="md" variant="dark" linkTo="/" />
          <div className="flex items-center gap-1 sm:gap-2">
            {searchToggle('')}
            {accountLink('hidden sm:block')}
            {wishlistLink('hidden sm:block')}
            {cartButton}
          </div>
        </div>

        {/* Desktop: logo across both rows; utility links above the navigation; search and icons on the right */}
        <div className="container-custom hidden lg:grid grid-cols-[1fr_auto_1fr] grid-rows-[34px_56px]">
          <div className="row-span-2 self-center justify-self-start">
            <BrandLogo size="md" variant="dark" linkTo="/" />
          </div>

          <nav aria-label="Utility" className="col-start-2 col-span-2 row-start-1 justify-self-end flex items-center gap-6 text-[13px]">
            {UTILITY_LINKS.map((l) => (
              <Link key={l.href} to={l.href} className="hover:underline underline-offset-4">
                {l.label}
              </Link>
            ))}
            <Link to={isAuthenticated ? '/account/profile' : '/register'} className="hover:underline underline-offset-4">
              {isAuthenticated ? 'my account' : 'join the club'}
            </Link>
            {isAdmin && (
              <Link to="/admin" className="font-bold hover:underline underline-offset-4">
                admin
              </Link>
            )}
          </nav>

          <nav
            aria-label="Main"
            className="col-start-2 row-start-2 flex items-stretch"
            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpenMenu(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && openMenu) {
                showMenu(null, 0);
                refocusing.current = true;
                document.getElementById(`nav-${openMenu}`)?.focus();
                refocusing.current = false;
              }
            }}
          >
            {navLinks.map((link) => {
              const key = navKey(link);
              const hasMega = megaColumns(link).length > 0;
              const open = hasMega && openMenu === key;
              return (
                // Not positioned: the mega menu inside is placed against the full-width box above. Being a
                // child of this item, hovering it keeps the menu open, and it follows the link in tab order.
                <div
                  key={key}
                  className="flex"
                  onMouseEnter={() => showMenu(hasMega ? key : null, hasMega && !openMenu ? 120 : 0)}
                  onMouseLeave={() => showMenu(null, 150)}
                >
                  <Link
                    id={`nav-${key}`}
                    to={link.href ?? '#'}
                    target={link.target}
                    onFocus={() => hasMega && !refocusing.current && showMenu(key, 0)}
                    aria-expanded={hasMega ? open : undefined}
                    aria-controls={hasMega ? `mega-${key}` : undefined}
                    className={clsx(
                      'flex items-center px-4 pt-[3px] border-b-[3px] text-[15px] uppercase tracking-[0.04em] transition-colors',
                      hasMega ? 'font-bold' : 'font-normal',
                      link.accent && 'text-brand-accent',
                      open || isActive(link) ? 'border-brand-black' : 'border-transparent hover:border-brand-black',
                    )}
                  >
                    {link.label}
                  </Link>
                  {hasMega && (
                    <MegaMenu
                      id={`mega-${key}`}
                      link={link}
                      open={open}
                      promos={promos}
                      onNavigate={() => setOpenMenu(null)}
                    />
                  )}
                </div>
              );
            })}
          </nav>

          <div className="col-start-3 row-start-2 justify-self-end flex items-center gap-2">
            <div className="hidden xl:block w-[240px] mr-2">
              <SearchSuggestions variant="inline" />
            </div>
            {searchToggle('xl:hidden')}
            {accountLink('')}
            {wishlistLink('')}
            {cartButton}
          </div>
        </div>
      </div>

      {/* Search Bar (expandable with autocomplete), opened from the search icon below the xl breakpoint */}
      {isSearchOpen && (
        <div className="border-b border-gray-200 animate-slide-in-up xl:hidden">
          <div className="container-custom py-4">
            <SearchSuggestions onClose={() => setSearchOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
