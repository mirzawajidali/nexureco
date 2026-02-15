import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { searchApi } from '@/api/products.api';
import ProductGrid from '@/components/product/ProductGrid';
import FilterSidebar from '@/components/filters/FilterSidebar';
import Pagination from '@/components/ui/Pagination';
import { APP_NAME } from '@/utils/constants';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined;
  const maxPrice = searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['search', q, page, sort, minPrice, maxPrice],
    queryFn: () =>
      searchApi.search({
        q,
        page,
        page_size: 20,
        sort,
        min_price: minPrice,
        max_price: maxPrice,
      }),
    enabled: !!q,
  });

  const products = data?.data?.items || [];
  const totalPages = data?.data?.total_pages || 0;
  const total = data?.data?.total || 0;

  const updateFilters = (filters: Record<string, unknown>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    if (!filters.page) params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({ q, page: '1', sort: 'newest' });
  };

  return (
    <>
      <Helmet>
        <title>Search: {q} | {APP_NAME}</title>
      </Helmet>

      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-heading-xl font-heading uppercase">
              {q ? `Results for "${q}"` : 'Search'}
            </h1>
            {q && <p className="text-sm text-gray-500 mt-1">{total} products found</p>}
          </div>

          <button
            onClick={() => setShowMobileFilters(true)}
            className="lg:hidden flex items-center gap-2 border border-gray-300 px-4 py-2 text-xs font-heading font-bold uppercase tracking-wider"
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
          </button>
        </div>

        {q ? (
          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <FilterSidebar
                minPrice={minPrice}
                maxPrice={maxPrice}
                sort={sort}
                onFilterChange={updateFilters}
                onClear={clearFilters}
              />
            </aside>

            {/* Products */}
            <div className="flex-1">
              <ProductGrid products={products} isLoading={isLoading} />
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => updateFilters({ page: p })}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-heading font-heading uppercase mb-2">Search for something</p>
            <p className="text-sm text-gray-500">Enter a search term above to find products.</p>
          </div>
        )}

        {/* Mobile Filters */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
            <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white p-6 overflow-y-auto animate-slide-in-right">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-bold uppercase text-lg">Filters</h3>
                <button onClick={() => setShowMobileFilters(false)}>
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <FilterSidebar
                minPrice={minPrice}
                maxPrice={maxPrice}
                sort={sort}
                onFilterChange={(f) => {
                  updateFilters(f);
                  setShowMobileFilters(false);
                }}
                onClear={() => {
                  clearFilters();
                  setShowMobileFilters(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
