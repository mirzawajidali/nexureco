import { useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { AdjustmentsHorizontalIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { categoriesApi } from '@/api/products.api';
import ProductGrid from '@/components/product/ProductGrid';
import FilterSidebar from '@/components/filters/FilterSidebar';
import Pagination from '@/components/ui/Pagination';
import RecentlyViewedSection from '@/components/product/RecentlyViewedSection';
import { APP_NAME } from '@/utils/constants';
import { clsx } from 'clsx';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined;
  const maxPrice = searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined;

  const { data: category } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => categoriesApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['category-products', slug, page, sort, minPrice, maxPrice],
    queryFn: () =>
      categoriesApi.getProducts(slug!, {
        page,
        page_size: 20,
        sort,
        min_price: minPrice,
        max_price: maxPrice,
      }),
    enabled: !!slug,
  });

  // Fetch parent category for breadcrumbs if this is a subcategory
  const parentId = category?.data?.parent_id;
  const { data: allCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const products = productsData?.data?.items || [];
  const totalPages = productsData?.data?.total_pages || 0;
  const total = productsData?.data?.total || 0;
  const cat = category?.data;
  const categoryName = cat?.name || slug?.replace(/-/g, ' ') || '';
  const children = cat?.children?.filter((c: { is_active: boolean }) => c.is_active) || [];

  // Build breadcrumb trail
  type Cat = { id: number; name: string; slug: string; parent_id: number | null };
  const findParent = (pid: number | null | undefined) => {
    if (!pid || !allCategories?.data) return null;
    return (allCategories.data as Cat[]).find((c) => c.id === pid);
  };
  const parent = findParent(parentId);

  // Build SEO link groups — sibling top-level categories, each with their children
  const allCatList = (allCategories?.data as Cat[] | undefined) || [];
  const rootId = parent?.parent_id ? findParent(parent.parent_id)?.id ?? parent.id : parent?.id ?? cat?.id;
  const linkGroups = allCatList
    .filter((c) => c.parent_id === (rootId ?? null) || (!rootId && c.parent_id === null))
    .slice(0, 5)
    .map((grp) => ({
      ...grp,
      items: allCatList.filter((c) => c.parent_id === grp.id).slice(0, 8),
    }));

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
        <title>{categoryName} | {APP_NAME}</title>
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
            {parent && (
              <>
                <span className="mx-1">/</span>
                <Link to={`/category/${parent.slug}`} className="hover:text-brand-black transition-colors underline">
                  {parent.name}
                </Link>
              </>
            )}
            <span className="mx-1">/</span>
            <span className="text-brand-black">{categoryName}</span>
          </nav>
        </div>

        {/* Heading + count */}
        <div className="mb-2">
          <h1 className="font-heading font-black uppercase tracking-tight leading-[0.95]"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)' }}
          >
            {categoryName}
            {total > 0 && (
              <span className="text-gray-400 font-normal ml-2"
                style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.25rem)' }}
              >
                [{total}]
              </span>
            )}
          </h1>
        </div>

        {/* Description */}
        {cat?.description && (
          <p className="text-sm text-gray-600 max-w-2xl mb-6 leading-relaxed">
            {cat.description}
          </p>
        )}

        {/* Sub-category tabs + Filter & Sort */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-8 gap-4">
          {/* Tabs (scrollable) */}
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide -mb-px">
            {children.length > 0 && children.map((child: { slug: string; name: string }) => (
              <Link
                key={child.slug}
                to={`/category/${child.slug}`}
                className={clsx(
                  'whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  slug === child.slug
                    ? 'border-brand-black text-brand-black'
                    : 'border-transparent text-gray-500 hover:text-brand-black hover:border-gray-300',
                )}
              >
                {child.name}
              </Link>
            ))}
          </div>

          {/* Filter & Sort button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex-shrink-0 inline-flex items-center gap-2 border border-gray-300 px-5 py-2.5 text-sm font-medium hover:border-brand-black transition-colors"
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

        {/* SEO Category Links Grid */}
        {linkGroups.length > 0 && (
          <section className="mt-16 pt-12 border-t border-gray-200">
            <h2 className="font-heading font-black uppercase tracking-tight mb-8"
              style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}
            >
              {(parent?.name || categoryName) + "'s Clothing And Shoe Categories"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-1">
              {linkGroups.map((grp) => (
                <div key={grp.id} className="mb-6">
                  <Link
                    to={`/category/${grp.slug}`}
                    className="block text-sm font-bold text-brand-black mb-3 hover:underline"
                  >
                    {grp.name}
                  </Link>
                  <ul className="space-y-2">
                    {grp.items.map((it) => (
                      <li key={it.id}>
                        <Link
                          to={`/category/${it.slug}`}
                          className="text-xs text-gray-600 hover:text-brand-black hover:underline"
                        >
                          {it.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SEO Long-form Content */}
        {cat?.description && (
          <section className="mt-12 pt-12 border-t border-gray-200">
            <h2 className="font-heading font-black uppercase tracking-tight mb-4"
              style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}
            >
              {APP_NAME} {categoryName}
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed max-w-4xl whitespace-pre-line">
              {cat.description}
            </div>
          </section>
        )}
      </div>

      {/* Green Sign-Up Banner — full bleed */}
      <section className="bg-[#0e4d3c] text-white">
        <div className="container-custom py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-heading font-bold uppercase tracking-wide text-base sm:text-lg text-center sm:text-left">
            Join {APP_NAME} & get 15% off your first order
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-brand-black px-6 py-3 font-heading font-bold uppercase text-sm tracking-wider hover:bg-gray-100 transition-colors"
          >
            Sign up for free
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Mobile/Tablet Filters Overlay */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white p-6 overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-bold uppercase text-lg">Filter & Sort</h3>
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
    </>
  );
}
