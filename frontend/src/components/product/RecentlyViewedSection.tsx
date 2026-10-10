import { useQuery } from '@tanstack/react-query';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { productsApi } from '@/api/products.api';
import ProductCard from './ProductCard';
import { useViewItemList } from '@/hooks/useAnalytics';

const RECENTLY_VIEWED_LIST = { id: 'recently_viewed', name: 'Recently Viewed' };

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

  const products = (data?.data?.items ?? []).slice(0, limit);
  useViewItemList(products, RECENTLY_VIEWED_LIST);

  // A row with one or two cards looks broken, so wait until there are a few to show
  if (products.length < 3) return null;

  return (
    <section className="mt-16 pt-12 border-t border-gray-200">
      <h2 className="type-promo mb-8">
        Recently Viewed
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
        {products.map((p, index) => (
          <ProductCard
            key={p.id}
            list={RECENTLY_VIEWED_LIST}
            index={index}
            id={p.id}
            name={p.name}
            slug={p.slug}
            price={p.base_price}
            compareAtPrice={p.compare_at_price}
            image={p.primary_image}
            categoryName={p.category_name}
            variantCount={p.variant_count}
            variantImages={p.variant_images}
            variantColors={p.variant_colors}
          />
        ))}
      </div>
    </section>
  );
}
