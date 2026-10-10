import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/api/products.api';

type CategoryNode = {
  name: string;
  slug: string;
  parent_id: number | null;
  is_active: boolean;
  product_count?: number;
  children?: CategoryNode[];
};

// Products in a category and all of its subcategories (same rule as the menus and sitemap)
const subtreeCount = (c: CategoryNode): number =>
  (c.product_count ?? 0) + (c.children ?? []).reduce((sum, child) => sum + subtreeCount(child), 0);

export default function FeaturedCollections() {
  const { data: catData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const categories = ((catData?.data ?? []) as CategoryNode[])
    .filter((c) => !c.parent_id && c.is_active && subtreeCount(c) > 0)
    .map((c) => ({
      name: c.name,
      href: `/category/${c.slug}`,
    }));

  if (!isLoading && categories.length === 0) return null;

  return (
    <section className="section-padding">
      <div className="container-custom">
        <h2 className="type-section mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="py-5 border-b border-gray-300 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-2/3" />
                </div>
              ))
            : categories.map((cat) => (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="group block py-5 border-b border-gray-300 hover:border-brand-black transition-colors duration-300"
                >
                  <h3 className="type-card-title text-brand-black group-hover:text-gray-600 transition-colors duration-300">
                    {cat.name}
                  </h3>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
