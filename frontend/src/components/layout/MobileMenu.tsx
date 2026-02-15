import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon, UserIcon, HeartIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { APP_NAME } from '@/utils/constants';
import { menusApi, type MenuItemData } from '@/api/pages.api';

interface NavLink {
  label: string;
  href: string;
  accent?: boolean;
  target?: '_blank';
  children?: NavLink[];
}

const FALLBACK_NAV_LINKS: NavLink[] = [
  { label: 'New Arrivals', href: '/category/new-arrivals' },
  { label: 'Men', href: '/category/men' },
  { label: 'Women', href: '/category/women' },
  { label: 'Kids', href: '/category/kids' },
  { label: 'Accessories', href: '/category/accessories' },
  { label: 'Sale', href: '/collections/sale', accent: true },
];

function mapMenuItems(items: MenuItemData[]): NavLink[] {
  return items.map((item) => ({
    label: item.title,
    href: item.url,
    accent: item.url.includes('sale'),
    target: item.open_in_new_tab ? '_blank' as const : undefined,
    children: item.children?.length > 0 ? mapMenuItems(item.children) : undefined,
  }));
}

export default function MobileMenu() {
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { isAuthenticated } = useAuth();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

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

  return (
    <Transition show={isMobileMenuOpen} as={Fragment}>
      <Dialog onClose={() => setMobileMenuOpen(false)} className="relative z-50 lg:hidden">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </TransitionChild>

        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="ease-in duration-200"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <DialogPanel className="fixed inset-y-0 left-0 w-full max-w-sm bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b">
              <span className="font-heading font-black text-xl tracking-tighter">
                {APP_NAME}
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
              {navLinks.map((link) => (
                <div key={link.href}>
                  {link.children ? (
                    <>
                      <div className="flex items-center border-b border-gray-100">
                        <Link
                          to={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex-1 block px-6 py-4 text-base font-heading font-bold uppercase tracking-wider hover:bg-gray-50 ${
                            link.accent ? 'text-brand-accent' : ''
                          }`}
                        >
                          {link.label}
                        </Link>
                        <button
                          onClick={() => setExpandedItem(expandedItem === link.href ? null : link.href)}
                          className="px-4 py-4 hover:bg-gray-50"
                        >
                          <ChevronDownIcon
                            className={`h-4 w-4 text-gray-400 transition-transform ${
                              expandedItem === link.href ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>
                      {expandedItem === link.href && (
                        <div className="bg-gray-50 border-b border-gray-100">
                          {link.children.map((child) => (
                            <Link
                              key={child.href}
                              to={child.href}
                              target={child.target}
                              onClick={() => setMobileMenuOpen(false)}
                              className="block px-10 py-3 text-sm font-heading font-bold uppercase tracking-wider text-gray-600 hover:text-brand-black hover:bg-gray-100 transition-colors"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={link.href}
                      target={link.target}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-6 py-4 text-base font-heading font-bold uppercase tracking-wider border-b border-gray-100 hover:bg-gray-50 ${
                        link.accent ? 'text-brand-accent' : ''
                      }`}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Account Links */}
            <div className="border-t border-gray-200 py-4">
              <Link
                to={isAuthenticated ? '/account/profile' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-gray-50"
              >
                <UserIcon className="h-5 w-5" />
                {isAuthenticated ? 'My Account' : 'Sign In'}
              </Link>
              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-gray-50"
              >
                <HeartIcon className="h-5 w-5" />
                Wishlist
              </Link>
            </div>
          </DialogPanel>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
