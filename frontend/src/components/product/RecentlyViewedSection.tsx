import { useQuery } from '@tanstack/react-query';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { productsApi } from '@/api/products.api';
import ProductCard from './ProductCard';

interface Props {
  excludeIds?: number[];
  limit?: number;
}

export default function RecentlyViewedSection({ excludeIds = [], limit = 8 }: Props) {
  const recentIds = useRecentlyViewedStore((s) => s.productIds);
  const filteredIds = recentIds.filter((id) => !excludeIds.includes(id));

  const { data } = useQuery({
    queryKey: ['recently-viewed', filteredIds.slice(0, limit).join(',')],
    queryFn: () =>
      productsApi.list({ ids: filteredIds.slice(0, limit).join(','), page_size: limit }),
    enabled: filteredIds.length > 0,
  });

  const products = data?.data?.items ?? [];

  if (products.length === 0) return null;

  return (
    <section className="mt-16 pt-12 border-t border-gray-200">
      <h2 className="text-heading font-heading uppercase mb-8">
        Recently Viewed
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
        {products.slice(0, limit).map((p) => (
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
    </section>
  );
}
