import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { APP_NAME } from '@/utils/constants';

const POPULAR_CATEGORIES = [
  { label: 'Men', href: '/category/men' },
  { label: 'Women', href: '/category/women' },
  { label: 'New Arrivals', href: '/category/new-arrivals' },
  { label: 'Sale', href: '/collections/sale' },
];

export default function NotFoundPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | {APP_NAME}</title>
      </Helmet>

      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
        <div className="text-center max-w-lg">
          <h1 className="text-display-xl font-heading uppercase mb-4">404</h1>
          <p className="text-heading font-heading uppercase mb-2">Page Not Found</p>
          <p className="text-sm text-gray-500 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-0 max-w-md mx-auto mb-8">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for products..."
              className="flex-1 border border-gray-300 border-r-0 px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
            />
            <button
              type="submit"
              className="bg-brand-black text-white px-5 py-3 hover:bg-gray-800 transition-colors"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
          </form>

          {/* Popular categories */}
          <div className="mb-8">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-gray-400 mb-3">
              Popular Categories
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {POPULAR_CATEGORIES.map((cat) => (
                <Link
                  key={cat.href}
                  to={cat.href}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium hover:border-brand-black hover:bg-gray-50 transition-colors"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          <Link to="/">
            <Button size="lg">Back to Home</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
