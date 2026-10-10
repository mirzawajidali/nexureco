import { useQuery } from '@tanstack/react-query';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { productsApi } from '@/api/products.api';
import ProductCard from '@/components/product/ProductCard';
import { useViewItemList } from '@/hooks/useAnalytics';

const STILL_INTERESTED_LIST = { id: 'still_interested_home', name: 'Still Interested (Home)' };

export default function StillInterested() {
  const recentIds = useRecentlyViewedStore((s) => s.productIds);

  const { data } = useQuery({
    queryKey: ['recently-viewed-home', recentIds.slice(0, 8).join(',')],
    queryFn: () =>
      productsApi.list({ ids: recentIds.slice(0, 8).join(','), page_size: 8 }),
    enabled: recentIds.length > 0,
  });

  const products = (data?.data?.items ?? []).slice(0, 4);
  useViewItemList(products, STILL_INTERESTED_LIST);

  // A row with one or two cards looks broken, so wait until there are a few to show
  if (products.length < 3) return null;

  return (
    <section className="section-padding">
      <div className="container-custom">
        <h2 className="text-heading-xl font-heading uppercase mb-10">
          Still interested?
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {products.map((p, index) => (
            <ProductCard
              key={p.id}
              list={STILL_INTERESTED_LIST}
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
      </div>
    </section>
  );
}
