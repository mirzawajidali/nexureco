import { useQuery } from '@tanstack/react-query';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { productsApi } from '@/api/products.api';
import ProductCard from '@/components/product/ProductCard';

export default function StillInterested() {
  const recentIds = useRecentlyViewedStore((s) => s.productIds);

  const { data } = useQuery({
    queryKey: ['recently-viewed-home', recentIds.slice(0, 8).join(',')],
    queryFn: () =>
      productsApi.list({ ids: recentIds.slice(0, 8).join(','), page_size: 8 }),
    enabled: recentIds.length > 0,
  });

  const products = data?.data?.items ?? [];

  if (products.length === 0) return null;

  return (
    <section className="section-padding">
      <div className="container-custom">
        <h2 className="text-heading-xl font-heading uppercase mb-10">
          Still interested?
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {products.slice(0, 4).map((p) => (
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
            />
          ))}
        </div>
      </div>
    </section>
  );
}
