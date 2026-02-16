import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collectionsApi } from '@/api/products.api';
import { RectangleStackIcon } from '@heroicons/react/24/outline';

interface Collection {
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  product_count: number;
}

function CollectionTile({
  col,
  featured = false,
}: {
  col: Collection;
  featured?: boolean;
}) {
  return (
    <Link
      to={`/collections/${col.slug}`}
      className={`group relative overflow-hidden bg-[#eceff1] block ${
        featured ? 'aspect-[4/5] sm:aspect-auto sm:h-full' : 'aspect-[4/5]'
      }`}
    >
      {/* Image */}
      {col.image_url ? (
        <img
          src={col.image_url}
          alt={col.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          sizes={featured ? '(max-width: 640px) 100vw, 50vw' : '(max-width: 640px) 50vw, 25vw'}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <RectangleStackIcon className="w-16 h-16 text-gray-300" />
        </div>
      )}

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all duration-300" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 md:p-8">
        {col.description && (
          <p className="text-xs text-white/70 mb-2 line-clamp-2 max-w-[280px] leading-relaxed">
            {col.description}
          </p>
        )}
        <h3
          className="text-white font-heading font-black uppercase leading-[0.95] tracking-tight"
          style={{
            fontSize: featured
              ? 'clamp(1.75rem, 3.5vw, 3.25rem)'
              : 'clamp(1.25rem, 2.5vw, 2rem)',
          }}
        >
          {col.name}
        </h3>
        <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-heading font-bold uppercase tracking-wider text-white">
          <span className="border-b-2 border-white pb-0.5 group-hover:border-white/60 transition-colors">
            Shop Collection
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
  );
}

export default function ShopByCollection() {
  const { data } = useQuery({
    queryKey: ['collections-featured'],
    queryFn: () => collectionsApi.featured().then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const collections: Collection[] = (data ?? []).slice(0, 5);

  if (collections.length === 0) return null;

  const [hero, ...rest] = collections;

  return (
    <section className="section-padding">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <span className="text-[11px] font-heading font-bold uppercase tracking-[0.25em] text-gray-400 mb-3 block">
            Curated For You
          </span>
          <h2 className="text-heading-xl font-heading uppercase">
            Collections
          </h2>
        </div>

        {/* Layout: hero left + stacked right */}
        {rest.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {/* Featured (tall, spans full left column) */}
            <CollectionTile col={hero} featured />

            {/* Right column: stacked grid */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {rest.map((col) => (
                <CollectionTile key={col.slug} col={col} />
              ))}
            </div>
          </div>
        ) : (
          /* Single collection — full width banner */
          <div className="aspect-[21/9]">
            <CollectionTile col={hero} featured />
          </div>
        )}
      </div>
    </section>
  );
}
