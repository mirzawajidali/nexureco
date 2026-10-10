import { useRef, useState } from 'react';
import { imageSrcSet } from '@/utils/image';

interface CarouselImage {
  id: number;
  url: string;
  alt_text: string | null;
}

interface ProductImageCarouselProps {
  images: CarouselImage[];
  productName: string;
  /** Open the full-screen viewer at this image */
  onOpen: (index: number) => void;
}

/**
 * Mobile product gallery: one image at a time, swiped with native scroll-snap, so the price,
 * sizes and Add to Bag follow straight after it instead of below every photo.
 */
export default function ProductImageCarousel({ images, productName, onOpen }: ProductImageCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = images.length;

  const onScroll = () => {
    const el = trackRef.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goTo = (index: number) => {
    const el = trackRef.current;
    el?.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  };

  if (count === 0) return <div className="aspect-[3/4] bg-[#eceff1]" />;

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={`${productName} photos`}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide overscroll-x-contain"
      >
        {images.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onOpen(idx)}
            aria-label={`Photo ${idx + 1} of ${count}, open full screen`}
            className="w-full shrink-0 snap-center aspect-[3/4] bg-[#eceff1]"
          >
            <img
              src={img.url}
              srcSet={imageSrcSet(img.url)}
              sizes="100vw"
              alt={img.alt_text || `${productName} - Image ${idx + 1}`}
              width={600}
              height={800}
              className="w-full h-full object-cover"
              loading={idx === 0 ? 'eager' : 'lazy'}
              fetchPriority={idx === 0 ? 'high' : undefined}
            />
          </button>
        ))}
      </div>

      {count > 1 && (
        <>
          <span className="absolute top-3 right-3 bg-white/90 px-2 py-1 text-xs font-bold tabular-nums" aria-hidden>
            {active + 1} / {count}
          </span>
          <div className="absolute bottom-2 inset-x-0 flex justify-center">
            {images.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => goTo(idx)}
                aria-label={`Show photo ${idx + 1}`}
                aria-current={idx === active ? 'true' : undefined}
                className="w-6 h-6 flex items-center justify-center"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all ${
                    idx === active ? 'w-4 bg-brand-black' : 'w-1.5 bg-brand-black/30'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
