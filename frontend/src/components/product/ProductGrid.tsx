import ProductCard from './ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import type { ProductListItem } from '@/api/products.api';

interface ProductGridProps {
  products: ProductListItem[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4;
}

export default function ProductGrid({ products, isLoading = false, columns = 4 }: ProductGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  if (isLoading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-4 lg:gap-6`}>
        {Array.from({ length: columns * 2 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-heading font-heading uppercase mb-2">No products found</p>
        <p className="text-sm text-gray-500">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 lg:gap-6`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          slug={product.slug}
          price={product.base_price}
          compareAtPrice={product.compare_at_price}
          image={product.primary_image}
          categoryName={product.category_name}
          variantCount={product.variant_count}
          variantImages={product.variant_images}
          isNew={Date.now() - new Date(product.created_at).getTime() < 30 * 24 * 60 * 60 * 1000}
          isBestSeller={product.total_sold >= 50}
        />
      ))}
    </div>
  );
}
