import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/api/products.api';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';

interface Tile {
  name: string;
  image: string | null;
  href: string;
}

export default function FeaturedCollections() {
  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const tiles: Tile[] = (catData?.data ?? [])
    .filter((c: { parent_id: number | null; is_active: boolean }) => !c.parent_id && c.is_active)
    .slice(0, 4)
    .map((c: { name: string; slug: string; image_url: string | null }) => ({
      name: c.name,
      image: c.image_url,
      href: `/category/${c.slug}`,
    }));

  if (tiles.length === 0) return null;

  const gridClass =
    tiles.length === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : tiles.length === 4
        ? 'grid-cols-2'
        : tiles.length === 2
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-1 sm:grid-cols-3';

  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="mb-8">
          <span className="text-[11px] font-heading font-bold uppercase tracking-[0.25em] text-gray-400 mb-3 block">
            Browse
          </span>
          <h2 className="text-heading-xl font-heading uppercase">
            Shop by Category
          </h2>
        </div>

        <div className={`grid ${gridClass} gap-3 md:gap-4`}>
          {tiles.map((tile) => (
            <Link
              key={tile.name}
              to={tile.href}
              className="group relative aspect-[3/2] overflow-hidden bg-[#eceff1]"
            >
              {tile.image ? (
                <img
                  src={tile.image}
                  alt={tile.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBagIcon className="w-16 h-16 text-gray-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent group-hover:from-black/70 transition-all duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 md:p-6">
                <h3
                  className="text-white font-heading font-black uppercase leading-[0.95] tracking-tight"
                  style={{ fontSize: 'clamp(1.1rem, 2vw, 1.75rem)' }}
                >
                  {tile.name}
                </h3>
                <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-heading font-bold uppercase tracking-wider text-white">
                  <span className="border-b-2 border-white pb-0.5 group-hover:border-white/70 transition-colors">
                    Shop Now
                  </span>
                  <svg
                    className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
