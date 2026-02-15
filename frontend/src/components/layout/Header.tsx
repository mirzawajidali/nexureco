import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  UserIcon,
  HeartIcon,
  ShoppingBagIcon,
  Bars3Icon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useUIStore } from '@/store/uiStore';
import SearchSuggestions from '@/components/search/SearchSuggestions';
import BrandLogo from '@/components/ui/BrandLogo';
import { menusApi, type MenuItemData } from '@/api/pages.api';

interface NavLink {
  label: string;
  href: string;
  accent?: boolean;
  target?: '_blank';
  children?: NavLink[];
}

const FALLBACK_NAV_LINKS: NavLink[] = [
  { label: 'NEW ARRIVALS', href: '/category/new-arrivals' },
  { label: 'MEN', href: '/category/men' },
  { label: 'WOMEN', href: '/category/women' },
  { label: 'KIDS', href: '/category/kids' },
  { label: 'ACCESSORIES', href: '/category/accessories' },
  { label: 'SALE', href: '/collections/sale', accent: true },
];

function mapMenuItems(items: MenuItemData[]): NavLink[] {
  return items.map((item) => ({
    label: item.title.toUpperCase(),
    href: item.url,
    accent: item.url.includes('sale'),
    target: item.open_in_new_tab ? '_blank' as const : undefined,
    children: item.children?.length > 0 ? mapMenuItems(item.children) : undefined,
  }));
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { isAuthenticated, isAdmin } = useAuth();

  const { data: menuData } = useQuery({
    queryKey: ['menu', 'header'],
    queryFn: () => menusApi.getByHandle('header'),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const navLinks = useMemo(() => {
    const items = menuData?.data?.items;
    if (!items || items.length === 0) return FALLBACK_NAV_LINKS;
    return mapMenuItems(items);
  }, [menuData]);

  const cartItemCount = useCartStore((s) => s.itemCount());
  const wishlistCount = useWishlistStore((s) => s.productIds.length);
  const { toggleMobileMenu, toggleSearch, isSearchOpen, setSearchOpen } = useUIStore();

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

  return (
    <header
      className={`sticky top-0 z-40 bg-white transition-all duration-300 ${
        isScrolled ? 'shadow-md' : ''
      } ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}
    >
      {/* Main Header */}
      <div className="border-b border-gray-200">
        <div className="container-custom flex items-center justify-between h-16 lg:h-20">
          {/* Mobile Menu Toggle */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 -ml-2 hover:bg-gray-100"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Logo */}
          <BrandLogo size="md" variant="dark" linkTo="/" />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <div
                key={link.href}
                className="relative"
                onMouseEnter={() => link.children && setOpenDropdown(link.href)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  to={link.href}
                  target={link.target}
                  className={`text-xs font-heading font-bold uppercase tracking-wider hover:text-gray-500 transition-colors inline-flex items-center gap-1 ${
                    link.accent ? 'text-brand-accent' : ''
                  }`}
                >
                  {link.label}
                  {link.children && (
                    <ChevronDownIcon className={`h-3 w-3 transition-transform ${openDropdown === link.href ? 'rotate-180' : ''}`} />
                  )}
                </Link>

                {/* Dropdown */}
                {link.children && openDropdown === link.href && (
                  <div className="absolute top-full left-0 pt-2 z-50">
                    <div className="bg-white border border-gray-200 shadow-lg min-w-[180px]">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          target={child.target}
                          className="block px-4 py-2.5 text-xs font-heading font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50 hover:text-brand-black transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Search Toggle */}
            <button
              onClick={toggleSearch}
              className="p-2 hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>

            {/* Account */}
            <Link
              to={isAuthenticated ? '/account/profile' : '/login'}
              className="p-2 hover:bg-gray-100 transition-colors hidden sm:block"
              aria-label="Account"
            >
              <UserIcon className="h-5 w-5" />
            </Link>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="p-2 hover:bg-gray-100 transition-colors hidden sm:block relative"
              aria-label="Wishlist"
            >
              <HeartIcon className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              onClick={() => useCartStore.getState().toggleCart()}
              className="p-2 hover:bg-gray-100 transition-colors relative"
              aria-label="Cart"
            >
              <ShoppingBagIcon className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>

            {/* Admin Link */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:block text-xs font-heading font-bold uppercase tracking-wider bg-brand-black text-white px-3 py-2 hover:bg-gray-800 transition-colors"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar (expandable with autocomplete) */}
      {isSearchOpen && (
        <div className="border-b border-gray-200 animate-slide-in-up">
          <div className="container-custom py-4">
            <SearchSuggestions onClose={() => setSearchOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
