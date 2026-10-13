import { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/effect-fade';
import { imageSrcSet } from '@/utils/image';
import { trackSelectPromotion, trackViewPromotion } from '@/utils/analytics';

export interface HeroBannerSlide {
  id: string | number;
  /** Small label above the headline (e.g. "NEW COLLECTION", "RUNNING") */
  eyebrow?: string;
  /** Main bold headline */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Background image URL */
  imageUrl?: string;
  /** Mobile-specific image (optional, falls back to imageUrl) */
  mobileImageUrl?: string;
  /** Describes the photo for screen readers; omit for a purely decorative image */
  imageAlt?: string;
  /** Background video URL — takes priority over imageUrl when provided */
  videoUrl?: string;
  /** CTA link */
  linkUrl: string;
  /** CTA button text */
  buttonText: string;
  /** Optional second CTA */
  secondaryButtonText?: string;
  secondaryLinkUrl?: string;
  /** Copy position: 'left' (default, bottom-left like Adidas) or 'center' (bottom-centre) */
  textAlign?: 'left' | 'center';
}

interface HeroBannerProps {
  slides?: HeroBannerSlide[];
  autoplayDelay?: number;
}

const defaultSlides: HeroBannerSlide[] = [
  {
    id: 1,
    eyebrow: 'New Season',
    title: 'THE NEW\nCOLLECTION',
    subtitle: 'Discover the latest styles designed for those who dare to stand out.',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80',
    linkUrl: '/collections/new-arrivals',
    buttonText: 'Shop Now',
  },
];

function SlideMedia({ slide, isFirst, onLoad }: { slide: HeroBannerSlide; isFirst: boolean; onLoad?: () => void }) {
  if (slide.videoUrl) {
    return (
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={slide.videoUrl}
        autoPlay
        loop
        muted
        playsInline
        poster={slide.imageUrl}
      />
    );
  }

  const src = slide.imageUrl ?? slide.mobileImageUrl;
  if (!src) return null;

  // <picture> so only one of the desktop/mobile images is downloaded.
  // Keep in sync with the hero preload in index.html (same srcset, sizes and breakpoint).
  return (
    <picture>
      {slide.mobileImageUrl && (
        <source
          media="(max-width: 767px)"
          srcSet={imageSrcSet(slide.mobileImageUrl) ?? slide.mobileImageUrl}
          sizes="100vw"
        />
      )}
      <img
        src={src}
        srcSet={imageSrcSet(src)}
        sizes="100vw"
        alt={slide.imageAlt ?? ''}
        className="absolute inset-0 w-full h-full object-cover"
        fetchPriority={isFirst ? 'high' : undefined}
        onLoad={onLoad}
        onError={onLoad}
      />
    </picture>
  );
}

/** GA4 promotion payload for a hero slide */
const toPromotion = (slide: HeroBannerSlide, index: number) => ({
  promotion_id: String(slide.id),
  promotion_name: slide.title.replace(/\s+/g, ' ').trim(),
  creative_slot: `hero_${index + 1}`,
});

function ArrowIcon() {
  return (
    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="square" d="M2 12h19m-5-5 5 5-5 5" />
    </svg>
  );
}

/** Entrance animation for one line of copy; steps in from below when its slide becomes active */
const reveal = (isActive: boolean, delay: string) =>
  `transition-all duration-500 ${delay} motion-reduce:transition-none ${
    isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
  }`;

function SlideContent({
  slide,
  isActive,
  onSelect,
}: {
  slide: HeroBannerSlide;
  isActive: boolean;
  onSelect: () => void;
}) {
  const centered = slide.textAlign === 'center';
  // With the fade effect every slide stays in the page, so hidden slides' links are kept out of the tab order
  const tabIndex = isActive ? undefined : -1;

  return (
    // Copy at the bottom, clear of the faces and chest logos in the photos; pb leaves room for the slider controls
    <div className="relative h-full flex items-end z-10" aria-hidden={!isActive}>
      <div className={`container-custom w-full pb-[4.75rem] md:pb-20 ${centered ? 'text-center' : ''}`}>
        <div className={`max-w-[34rem] ${centered ? 'mx-auto' : ''}`}>
          {slide.eyebrow && (
            <p className={`hero-eyebrow mb-2 ${reveal(isActive, 'delay-100')}`}>
              <span className="hero-label">{slide.eyebrow}</span>
            </p>
          )}

          <h2 className={`hero-title ${reveal(isActive, 'delay-150')}`}>
            <span className="hero-label" style={{ whiteSpace: 'pre-line' }}>
              {slide.title}
            </span>
          </h2>

          {slide.subtitle && (
            <p className={`hero-subtitle mt-2 max-w-[30rem] ${centered ? 'mx-auto' : ''} ${reveal(isActive, 'delay-200')}`}>
              <span className="hero-label">{slide.subtitle}</span>
            </p>
          )}

          <div className={`flex flex-wrap gap-4 mt-6 md:mt-7 ${centered ? 'justify-center' : ''} ${reveal(isActive, 'delay-300')}`}>
            <Link to={slide.linkUrl} onClick={onSelect} tabIndex={tabIndex} className="hero-cta">
              {slide.buttonText}
              <ArrowIcon />
            </Link>

            {slide.secondaryButtonText && slide.secondaryLinkUrl && (
              <Link to={slide.secondaryLinkUrl} onClick={onSelect} tabIndex={tabIndex} className="hero-cta">
                {slide.secondaryButtonText}
                <ArrowIcon />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const controlBtn = 'w-9 h-9 flex items-center justify-center hover:bg-gray-100 transition-colors';

export default function HeroBanner({ slides = defaultSlides, autoplayDelay = 5000 }: HeroBannerProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // With "reduce motion" on, slides don't advance on their own (the play button still starts them)
  const [prefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const [isPlaying, setIsPlaying] = useState(!prefersReducedMotion);
  // With the fade effect every slide sits in the viewport, so lazy-loading can't hold back
  // slides 2+. Render their media only once the first slide's image is done.
  const [firstImageDone, setFirstImageDone] = useState(false);
  const firstHasImage = !!(slides[0]?.imageUrl || slides[0]?.mobileImageUrl) && !slides[0]?.videoUrl;
  const showAllMedia = firstImageDone || !firstHasImage;

  const onSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
  }, []);

  // GA4 view_promotion: once per slide, after it has been on screen for 1s
  // (skips the fallback slide that flashes while banners load, and autoplay re-loops)
  const viewedSlides = useRef(new Set<string | number>());
  useEffect(() => {
    const slide = slides[activeIndex];
    if (!slide || viewedSlides.current.has(slide.id)) return;
    const timer = window.setTimeout(() => {
      viewedSlides.current.add(slide.id);
      trackViewPromotion(toPromotion(slide, activeIndex));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [slides, activeIndex]);

  const togglePlay = useCallback(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    if (isPlaying) {
      swiper.autoplay?.stop();
      setIsPlaying(false);
    } else {
      swiper.autoplay?.start();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const singleSlide = slides.length <= 1;

  return (
    <section
      className="relative w-full hero-height bg-gray-100 overflow-hidden"
      aria-roledescription={singleSlide ? undefined : 'carousel'}
      aria-label={singleSlide ? undefined : 'Featured'}
    >
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={800}
        autoplay={singleSlide ? false : { delay: autoplayDelay, disableOnInteraction: false, pauseOnMouseEnter: true }}
        loop={!singleSlide}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          if (prefersReducedMotion) swiper.autoplay?.stop();
        }}
        onSlideChange={onSlideChange}
        className="h-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide
            key={slide.id}
            className="relative"
            aria-roledescription={singleSlide ? undefined : 'slide'}
            aria-label={singleSlide ? undefined : `${index + 1} of ${slides.length}`}
          >
            {(index === 0 || showAllMedia) && (
              <SlideMedia
                slide={slide}
                isFirst={index === 0}
                onLoad={index === 0 ? () => setFirstImageDone(true) : undefined}
              />
            )}

            <SlideContent
              slide={slide}
              isActive={index === activeIndex}
              onSelect={() => trackSelectPromotion(toPromotion(slide, index))}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Slider controls: a white bar at the bottom centre, readable on any photo and clear of the
          chat buttons fixed at the bottom right */}
      {!singleSlide && (
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center bg-white text-black">
          <button
            type="button"
            onClick={() => swiperRef.current?.slidePrev()}
            aria-label="Previous slide"
            className={controlBtn}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="square" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => swiperRef.current?.slideToLoop(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              className="group w-7 h-9 flex items-center justify-center"
            >
              <span
                className={`block h-0.5 w-5 transition-colors ${
                  index === activeIndex ? 'bg-black' : 'bg-black/25 group-hover:bg-black/60'
                }`}
              />
            </button>
          ))}

          <button
            type="button"
            onClick={() => swiperRef.current?.slideNext()}
            aria-label="Next slide"
            className={controlBtn}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="square" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <span className="w-px h-5 bg-gray-200" aria-hidden="true" />

          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            className={controlBtn}
          >
            {isPlaying ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="4" width="5" height="16" />
                <rect x="14" y="4" width="5" height="16" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4v16l14-8z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
