import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { newsletterApi } from '@/api/user.api';
import { APP_NAME } from '@/utils/constants';
import { menusApi } from '@/api/pages.api';
import BrandLogo from '@/components/ui/BrandLogo';

const FALLBACK_FOOTER_LINKS = {
  'PRODUCTS': [
    { label: 'Men', href: '/category/men' },
    { label: 'Women', href: '/category/women' },
    { label: 'Kids', href: '/category/kids' },
    { label: 'New Arrivals', href: '/category/new-arrivals' },
    { label: 'Sale', href: '/collections/sale' },
  ],
  'SUPPORT': [
    { label: 'Help Center', href: '/page/help' },
    { label: 'Track Order', href: '/track-order' },
    { label: 'Shipping Info', href: '/page/shipping' },
    { label: 'Returns & Exchange', href: '/page/returns' },
    { label: 'Size Guide', href: '/size-guide' },
  ],
  'COMPANY': [
    { label: 'About Us', href: '/page/about' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Careers', href: '/page/careers' },
    { label: 'Privacy Policy', href: '/page/privacy' },
    { label: 'Terms of Service', href: '/page/terms' },
  ],
};

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const { data: productsMenu } = useQuery({
    queryKey: ['menu', 'footer-products'],
    queryFn: () => menusApi.getByHandle('footer-products'),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const { data: supportMenu } = useQuery({
    queryKey: ['menu', 'footer-support'],
    queryFn: () => menusApi.getByHandle('footer-support'),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const { data: companyMenu } = useQuery({
    queryKey: ['menu', 'footer-company'],
    queryFn: () => menusApi.getByHandle('footer-company'),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const footerColumns = useMemo(() => {
    const fallbackKeys = Object.keys(FALLBACK_FOOTER_LINKS) as (keyof typeof FALLBACK_FOOTER_LINKS)[];
    const menuResponses = [productsMenu, supportMenu, companyMenu];

    return fallbackKeys.map((key, i) => {
      const menuData = menuResponses[i]?.data;
      if (menuData && menuData.items.length > 0) {
        return {
          title: menuData.name.toUpperCase(),
          links: menuData.items.map((item) => ({
            label: item.title,
            href: item.url,
            target: item.open_in_new_tab ? '_blank' as const : undefined,
          })),
        };
      }
      return {
        title: key,
        links: FALLBACK_FOOTER_LINKS[key],
      };
    });
  }, [productsMenu, supportMenu, companyMenu]);

  const subscribeMutation = useMutation({
    mutationFn: (e: string) => newsletterApi.subscribe(e),
    onSuccess: () => {
      setSubscribed(true);
      setEmail('');
    },
  });

  return (
    <footer className="bg-brand-black text-white">
      {/* Newsletter Section */}
      <div className="border-b border-gray-800">
        <div className="container-custom section-padding">
          <div className="max-w-xl">
            <h3 className="text-heading font-heading uppercase mb-2">
              Stay in the Loop
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Subscribe to get special offers, free giveaways, and new arrivals.
            </p>
            <div className="min-h-[48px]">
            {subscribed ? (
              <p className="text-sm text-green-400 font-medium">
                Thanks for subscribing! You'll hear from us soon.
              </p>
            ) : (
              <form
                className="flex gap-0"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) subscribeMutation.mutate(email.trim());
                }}
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 bg-transparent border border-gray-600 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={subscribeMutation.isPending}
                  className="bg-white text-brand-black px-8 py-3 font-heading font-bold uppercase text-sm tracking-wider hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {subscribeMutation.isPending ? 'Sending...' : 'Subscribe'}
                </button>
              </form>
            )}
            {subscribeMutation.isError && (
              <p className="text-sm text-red-400 mt-2">
                {(subscribeMutation.error as any)?.response?.data?.detail ?? 'Something went wrong. Please try again.'}
              </p>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="container-custom py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-6">
              <BrandLogo size="md" variant="light" linkTo="/" />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Premium fashion & apparel for those who dare to stand out.
            </p>
          </div>

          {/* Link Columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-heading font-bold uppercase tracking-wider mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      target={(link as any).target}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="container-custom py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <span className="text-xs text-gray-500">Cash on Delivery Available</span>
            <div className="flex items-center gap-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.737-.9 10.125-5.864 10.125-11.854z"/></svg>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
