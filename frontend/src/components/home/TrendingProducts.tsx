import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/products.api';
import ProductCard from '@/components/product/ProductCard';

export default function TrendingProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ['trending-products'],
    queryFn: () => productsApi.bestSellers(4),
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.data ?? [];

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="section-padding bg-gray-50">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-heading-xl font-heading uppercase">Trending Now</h2>
          <Link
            to="/category/new-arrivals"
            className="text-xs font-heading font-bold uppercase tracking-wider border-b-2 border-brand-black pb-0.5 hover:text-gray-600 transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-gray-200 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
              ))
            : products.map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  slug={p.slug}
                  price={p.base_price}
                  compareAtPrice={p.compare_at_price}
                  image={p.primary_image}
                  categoryName={p.category_name}
                  variantCount={p.variant_count}
                  variantImages={p.variant_images}
                  isBestSeller
                />
              ))}
        </div>
      </div>
    </section>
  );
}
