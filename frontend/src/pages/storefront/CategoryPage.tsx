import { useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { AdjustmentsHorizontalIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { categoriesApi } from '@/api/products.api';
import ProductGrid from '@/components/product/ProductGrid';
import FilterSidebar, { SORT_OPTIONS } from '@/components/filters/FilterSidebar';
import Pagination from '@/components/ui/Pagination';
import RecentlyViewedSection from '@/components/product/RecentlyViewedSection';
import ComingSoon from '@/components/product/ComingSoon';
import { APP_DESCRIPTION, SITE_NAME } from '@/utils/constants';
import { truncateText } from '@/utils/formatters';
import { breadcrumbStructuredData } from '@/utils/seo';
import { trackFilters } from '@/utils/analytics';
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
  const { data: allCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const products = productsData?.data?.items || [];
  const totalPages = productsData?.data?.total_pages || 0;
  const total = productsData?.data?.total || 0;
  const cat = category?.data;
  const categoryName = cat?.name || slug?.replace(/-/g, ' ') || '';
  const analyticsList = { id: `category_${slug}`, name: `Category: ${categoryName}` };
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
  // Nothing stocked in this category or any subcategory yet (as opposed to a price filter that
  // matched nothing). Same rule as backend listing_service, which hides it from menus and the sitemap.
  const subtreeProductCount = (() => {
    type Node = { slug: string; product_count?: number; children?: Node[] };
    const count = (n: Node): number => (n.product_count ?? 0) + (n.children ?? []).reduce((s, c) => s + count(c), 0);
    const find = (nodes: Node[]): Node | undefined => {
      for (const n of nodes) {
        if (n.slug === slug) return n;
        const hit = find(n.children ?? []);
        if (hit) return hit;
      }
    };
    const node = find((allCategories?.data as Node[] | undefined) ?? []);
    return node ? count(node) : undefined;
  })();
  const isEmpty =
    !isLoading && !categoriesLoading && total === 0 && minPrice === undefined && maxPrice === undefined &&
    !subtreeProductCount;
  const description =
    cat?.meta_description ||
    (cat?.description
      ? truncateText(cat.description.split(/\n\s*\n/)[0], 160)
      : `Shop ${categoryName} at ${SITE_NAME}. ${APP_DESCRIPTION}.`);

  return (
    <>
      {/* A custom meta title is used as-is (it usually already names the brand) */}
      <Helmet {...(cat?.meta_title ? { titleTemplate: '%s' } : {})}>
        <title>{cat?.meta_title || categoryName}</title>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbStructuredData([[categoryName, `/category/${slug}`]]))}
        </script>
        <meta name="description" content={description} />
        {/* Thin "coming soon" pages shouldn't be indexed; links on them are still followed */}
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
        {/* The count stays outside the <h1> so the heading is just the category name */}
        <div className="mb-2 flex items-baseline gap-3 flex-wrap">
          <h1 className="type-display">
            {categoryName}
          </h1>
          {total > 0 && (
            <span className="text-gray-600 text-sm">
              {total} {total === 1 ? 'product' : 'products'}
            </span>
          )}
        </div>

        {/* Intro: the description's first paragraph (the full text is in the section at the bottom) */}
        {cat?.description && (
          <p className="text-sm text-gray-600 max-w-2xl mb-6 leading-relaxed">
            {cat.description.split(/\n\s*\n/)[0]}
          </p>
        )}

        {isEmpty ? (
          <ComingSoon name={categoryName} />
        ) : (
        <>
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

          {/* Sort (always visible) + filters drawer */}
          <div className="flex-shrink-0 flex items-center gap-2 mb-2">
            <label htmlFor="category-sort" className="sr-only">Sort by</label>
            <select
              id="category-sort"
              value={sort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium hover:border-brand-black transition-colors"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowMobileFilters(true)}
              className="inline-flex items-center gap-2 border border-gray-300 px-4 py-2.5 text-sm font-medium hover:border-brand-black transition-colors"
            >
              Filter
              <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Products */}
        <div>
          {/* Every product here is in this category, so cards don't repeat its name */}
          <ProductGrid products={products} isLoading={isLoading} list={analyticsList} showCategoryName={false} />
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

        {/* SEO Category Links Grid */}
        {linkGroups.length > 0 && (
          <section className="mt-16 pt-12 border-t border-gray-200">
            <h2 className="type-section mb-8">
              Shop by Category
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
            <h2 className="type-section mb-4">
              {`Shop ${categoryName} at ${SITE_NAME}`}
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed max-w-4xl whitespace-pre-line">
              {cat.description}
            </div>
          </section>
        )}
      </div>

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
