import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import {
  XMarkIcon,
  UserIcon,
  HeartIcon,
  ChevronDownIcon,
  TruckIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { APP_NAME } from '@/utils/constants';
import { megaColumns, useHeaderNav } from '@/utils/navigation';

const SUPPORT_LINKS = [
  { label: 'Track Order', href: '/track-order', Icon: TruckIcon },
  { label: 'Help & FAQ', href: '/page/faq', Icon: QuestionMarkCircleIcon },
  { label: 'Contact Us', href: '/contact', Icon: ChatBubbleLeftEllipsisIcon },
  { label: 'About Us', href: '/about', Icon: InformationCircleIcon },
];

export default function MobileMenu() {
  const { isMobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const { isAuthenticated } = useAuth();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const navLinks = useHeaderNav();

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
          <DialogPanel id="mobile-menu" className="fixed inset-y-0 left-0 w-full max-w-sm bg-white overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b">
              <span className="font-display text-xl uppercase tracking-[2px]">
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
              {navLinks.map((link) => {
                const columns = megaColumns(link);
                const expanded = expandedItem === link.label;
                const panelId = `mobile-nav-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                return (
                <div key={link.label}>
                  {columns.length > 0 ? (
                    <>
                      <div className="flex items-center border-b border-gray-100">
                        <Link
                          to={link.href ?? '#'}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex-1 block px-6 py-4 text-base font-heading font-bold uppercase tracking-wider hover:bg-gray-50 ${
                            link.accent ? 'text-brand-accent' : ''
                          }`}
                        >
                          {link.label}
                        </Link>
                        <button
                          onClick={() => setExpandedItem(expanded ? null : link.label)}
                          className="px-4 py-4 hover:bg-gray-50"
                          aria-label={`${link.label} menu`}
                          aria-expanded={expanded}
                          aria-controls={panelId}
                        >
                          <ChevronDownIcon
                            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                      {/* Mega-menu columns as sections: heading, then its links */}
                      <div id={panelId} hidden={!expanded} className="bg-gray-50 border-b border-gray-100 py-2">
                        {columns.map((col, i) => (
                          <div key={col.heading?.label ?? i} className="py-2">
                            {col.heading &&
                              (col.heading.href ? (
                                <Link
                                  to={col.heading.href}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="block px-10 pt-2 pb-1 text-xs font-heading font-bold uppercase tracking-wider text-gray-500 hover:text-brand-black"
                                >
                                  {col.heading.label}
                                </Link>
                              ) : (
                                <p className="px-10 pt-2 pb-1 text-xs font-heading font-bold uppercase tracking-wider text-gray-500">
                                  {col.heading.label}
                                </p>
                              ))}
                            {col.links.map((child) => (
                              <Link
                                key={`${child.label}-${child.href}`}
                                to={child.href!}
                                target={child.target}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-10 py-2.5 text-sm hover:text-brand-black hover:bg-gray-100 transition-colors ${
                                  child.accent ? 'text-brand-accent' : 'text-gray-700'
                                }`}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Link
                      to={link.href ?? '#'}
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
                );
              })}
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

            {/* Help — the desktop top-bar links, which have no other home on mobile */}
            <div className="border-t border-gray-200 py-4">
              {SUPPORT_LINKS.map(({ label, href, Icon }) => (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-gray-50"
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              ))}
            </div>
          </DialogPanel>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
