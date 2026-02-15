import { useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { AdjustmentsHorizontalIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { collectionsApi } from '@/api/products.api';
import ProductGrid from '@/components/product/ProductGrid';
import FilterSidebar from '@/components/filters/FilterSidebar';
import Pagination from '@/components/ui/Pagination';
import RecentlyViewedSection from '@/components/product/RecentlyViewedSection';
import { APP_NAME } from '@/utils/constants';

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined;
  const maxPrice = searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined;

  const { data: collection } = useQuery({
    queryKey: ['collection', slug],
    queryFn: () => collectionsApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['collection-products', slug, page, sort, minPrice, maxPrice],
    queryFn: () =>
      collectionsApi.getProducts(slug!, {
        page,
        page_size: 20,
        sort,
        min_price: minPrice,
        max_price: maxPrice,
      }),
    enabled: !!slug,
  });

  const products = productsData?.data?.items || [];
  const totalPages = productsData?.data?.total_pages || 0;
  const total = productsData?.data?.total || 0;
  const col = collection?.data;
  const collectionName = col?.name || slug?.replace(/-/g, ' ') || '';

  const updateFilters = (filters: Record<string, unknown>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({ page: '1', sort: 'newest' });
  };

  const productIds = products.map((p) => p.id);

  return (
    <>
      <Helmet>
        <title>{collectionName} | {APP_NAME}</title>
      </Helmet>

      <div className="container-custom py-6 sm:py-8">
        {/* Back + Breadcrumb row */}
        <div className="flex items-center gap-3 text-sm mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-brand-black hover:underline font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
          <nav className="flex items-center gap-1 text-gray-500">
            <Link to="/" className="hover:text-brand-black transition-colors underline">Home</Link>
            <span className="mx-1">/</span>
            <Link to="/collections" className="hover:text-brand-black transition-colors underline">Collections</Link>
            <span className="mx-1">/</span>
            <span className="text-brand-black">{collectionName}</span>
          </nav>
        </div>

        {/* Heading + count */}
        <div className="mb-2">
          <h1
            className="font-heading font-black uppercase tracking-tight leading-[0.95]"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)' }}
          >
            {collectionName}
            {total > 0 && (
              <span
                className="text-gray-400 font-normal ml-2"
                style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.25rem)' }}
              >
                [{total}]
              </span>
            )}
          </h1>
        </div>

        {/* Description */}
        {col?.description && (
          <p className="text-sm text-gray-600 max-w-2xl mb-6 leading-relaxed">
            {col.description}
          </p>
        )}

        {/* Filter & Sort bar */}
        <div className="flex items-center justify-end border-b border-gray-200 mb-8 pb-0">
          <button
            onClick={() => setShowFilters(true)}
            className="flex-shrink-0 inline-flex items-center gap-2 border border-gray-300 px-5 py-2.5 text-sm font-medium hover:border-brand-black transition-colors mb-[-1px] bg-white"
          >
            Filter & Sort
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Products */}
        <div>
          <ProductGrid products={products} isLoading={isLoading} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => updateFilters({ page: p })}
          />
        </div>

        {/* Recently Viewed */}
        <RecentlyViewedSection excludeIds={productIds} />
      </div>

      {/* Filter Overlay */}
      {showFilters && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white p-6 overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-bold uppercase text-lg">Filter & Sort</h3>
              <button onClick={() => setShowFilters(false)}>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <FilterSidebar
              minPrice={minPrice}
              maxPrice={maxPrice}
              sort={sort}
              onFilterChange={(f) => {
                updateFilters(f);
                setShowFilters(false);
              }}
              onClear={() => {
                clearFilters();
                setShowFilters(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
