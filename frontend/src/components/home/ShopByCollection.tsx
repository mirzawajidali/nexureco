import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { collectionsApi } from '@/api/products.api';
import { RectangleStackIcon } from '@heroicons/react/24/outline';

interface Collection {
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  product_count: number;
}

function CollectionCard({ col }: { col: Collection }) {
  return (
    <Link to={`/collections/${col.slug}`} className="group block p-2 -m-2 border border-transparent hover:border-black transition-colors">
      {/* Image */}
      <div className="relative overflow-hidden bg-[#eceff1] aspect-[3/4]">
        {col.image_url ? (
          <img
            src={col.image_url}
            alt={col.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            sizes="(max-width: 640px) 80vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <RectangleStackIcon className="w-16 h-16 text-gray-300" />
          </div>
        )}
      </div>

      {/* Text content below image */}
      <div className="pt-5">
        <h3 className="font-heading font-black uppercase text-base sm:text-lg tracking-tight text-black">
          {col.name}
        </h3>
        {col.description && (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-2">
            {col.description}
          </p>
        )}
        <span className="inline-block mt-4 text-xs font-heading font-bold uppercase tracking-wider text-black border-b-2 border-black pb-0.5 group-hover:border-gray-400 transition-colors">
          Shop Now
        </span>
      </div>
    </Link>
  );
}

export default function ShopByCollection() {
  const swiperRef = useRef<SwiperType | null>(null);

  const { data } = useQuery({
    queryKey: ['collections-featured'],
    queryFn: () => collectionsApi.featured().then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const collections: Collection[] = data ?? [];

  if (collections.length === 0) return null;

  return (
    <section className="section-padding">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-heading font-bold uppercase tracking-[0.25em] text-gray-400 mb-3 block">
              Curated For You
            </span>
            <h2 className="text-heading-xl font-heading uppercase">Collections</h2>
          </div>

          {/* Nav buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous collection"
              onClick={() => swiperRef.current?.slidePrev()}
              className="w-11 h-11 flex items-center justify-center border-2 border-black text-black hover:bg-black hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next collection"
              onClick={() => swiperRef.current?.slideNext()}
              className="w-11 h-11 flex items-center justify-center border-2 border-black text-black hover:bg-black hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Slider */}
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          onSwiper={(s) => (swiperRef.current = s)}
          spaceBetween={12}
          slidesPerView={1.25}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 16 },
            1024: { slidesPerView: 3, spaceBetween: 20 },
            1280: { slidesPerView: 4, spaceBetween: 24 },
          }}
          loop={collections.length > 4}
          autoplay={{ delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true }}
          pagination={{ clickable: true, el: '.collections-pagination' }}
          className="!overflow-visible sm:!overflow-hidden"
        >
          {collections.map((col) => (
            <SwiperSlide key={col.slug} className="h-auto">
              <CollectionCard col={col} />
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="collections-pagination flex justify-center gap-2 mt-6 sm:hidden" />
      </div>
    </section>
  );
}
