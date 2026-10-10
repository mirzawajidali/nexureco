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
import { trackFilters } from '@/utils/analytics';
import ComingSoon from '@/components/product/ComingSoon';
import { APP_DESCRIPTION, SITE_NAME } from '@/utils/constants';
import { truncateText } from '@/utils/formatters';
import { breadcrumbStructuredData } from '@/utils/seo';

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
  const analyticsList = { id: `collection_${slug}`, name: `Collection: ${collectionName}` };

  const updateFilters = (filters: Record<string, unknown>) => {
    trackFilters(filters, analyticsList);
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
  // Nothing in the collection yet (as opposed to a price filter that matched nothing)
  const isEmpty = !isLoading && total === 0 && minPrice === undefined && maxPrice === undefined;
  const description =
    col?.meta_description ||
    (col?.description
      ? truncateText(col.description, 160)
      : `Shop the ${collectionName} collection at ${SITE_NAME}. ${APP_DESCRIPTION}.`);

  return (
    <>
      {/* A custom meta title is used as-is (it usually already names the brand) */}
      <Helmet {...(col?.meta_title ? { titleTemplate: '%s' } : {})}>
        <title>{col?.meta_title || `${collectionName} T-Shirts and Tees`}</title>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbStructuredData([[collectionName, `/collections/${slug}`]]))}
        </script>
        <meta name="description" content={description} />
        {isEmpty && <meta name="robots" content="noindex, follow" />}
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
            <span>Collections</span>
            <span className="mx-1">/</span>
            <span className="text-brand-black">{collectionName}</span>
          </nav>
        </div>

        {/* Heading + count */}
        {/* The count stays outside the <h1> so the heading is just the collection name */}
        <div className="mb-2 flex items-baseline gap-3 flex-wrap">
          <h1
            className="type-display">
            {collectionName}
          </h1>
          {total > 0 && (
            <span className="text-gray-600 text-sm">
              {total} {total === 1 ? 'product' : 'products'}
            </span>
          )}
        </div>

        {/* Description */}
        {col?.description && (
          <p className="text-sm text-gray-600 max-w-2xl mb-6 leading-relaxed">
            {col.description}
          </p>
        )}

        {isEmpty ? (
          <ComingSoon name={collectionName} />
        ) : (
        <>
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
          <ProductGrid products={products} isLoading={isLoading} list={analyticsList} />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => updateFilters({ page: p })}
          />
        </div>
        </>
        )}

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
