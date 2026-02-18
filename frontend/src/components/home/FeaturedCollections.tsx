import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/api/products.api';

export default function FeaturedCollections() {
  const { data: catData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const categories = (catData?.data ?? [])
    .filter((c: { parent_id: number | null; is_active: boolean }) => !c.parent_id && c.is_active)
    .map((c: { name: string; slug: string }) => ({
      name: c.name,
      href: `/category/${c.slug}`,
    }));

  if (!isLoading && categories.length === 0) return null;

  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="py-5 border-b border-gray-300 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-2/3" />
                </div>
              ))
            : categories.map((cat: { name: string; href: string }) => (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className="group block py-5 border-b border-gray-300 hover:border-brand-black transition-colors duration-300"
                >
                  <span className="text-lg sm:text-xl font-heading font-black lowercase tracking-tight text-brand-black group-hover:text-gray-600 transition-colors duration-300">
                    {cat.name}
                  </span>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
