import { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { imageSrcSet } from '@/utils/image';
import { trackSelectPromotion, trackViewPromotion } from '@/utils/analytics';

export interface HeroBannerSlide {
  id: string | number;
  /** Small text above the headline (e.g. "NEW COLLECTION", "RUNNING") */
  eyebrow?: string;
  /** Main bold headline */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Background image URL */
  imageUrl?: string;
  /** Mobile-specific image (optional, falls back to imageUrl) */
  mobileImageUrl?: string;
  /** Background video URL — takes priority over imageUrl when provided */
  videoUrl?: string;
  /** CTA link */
  linkUrl: string;
  /** CTA button text */
  buttonText: string;
  /** Optional second CTA */
  secondaryButtonText?: string;
  secondaryLinkUrl?: string;
  /** Text alignment: 'left' (default) or 'center' */
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
        alt=""
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

function SlideContent({
  slide,
  isActive,
  onSelect,
}: {
  slide: HeroBannerSlide;
  isActive: boolean;
  onSelect: () => void;
}) {
  const centered = slide.textAlign !== 'left';

  return (
    <div className={`relative h-full flex z-10 ${centered ? 'items-center' : 'items-end'}`}>
      <div className={`container-custom w-full ${centered ? 'text-center' : 'pb-16 md:pb-20 lg:pb-24'}`}>
        <div className={`${centered ? 'max-w-3xl mx-auto' : 'max-w-2xl'}`}>
          {/* Eyebrow */}
          {slide.eyebrow && (
            <span
              className={`inline-block text-xs md:text-sm font-heading font-bold uppercase tracking-[0.2em] text-white mb-3 md:mb-4 transition-all duration-500 delay-100 ${
                isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {slide.eyebrow}
            </span>
          )}

          {/* Headline */}
          <h2
            className={`font-heading font-black uppercase text-white leading-[0.9] tracking-tight mb-4 md:mb-5 transition-all duration-600 delay-200 hero-headline ${
              isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ whiteSpace: 'pre-line' }}
          >
            {slide.title}
          </h2>

          {/* Subtitle */}
          {slide.subtitle && (
            <p
              className={`text-sm md:text-base text-white/85 mb-6 md:mb-8 max-w-md font-body leading-relaxed transition-all duration-500 delay-300 ${
                centered ? 'mx-auto' : ''
              } ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              {slide.subtitle}
            </p>
          )}

          {/* CTA Buttons */}
          <div
            className={`flex gap-3 ${centered ? 'justify-center' : ''} transition-all duration-500 delay-[400ms] ${
              isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Link to={slide.linkUrl} onClick={onSelect} className="hero-btn hero-btn-primary group">
              {slide.buttonText}
              <svg
                className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>

            {slide.secondaryButtonText && slide.secondaryLinkUrl && (
              <Link to={slide.secondaryLinkUrl} onClick={onSelect} className="hero-btn hero-btn-outline group">
                {slide.secondaryButtonText}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <section className="relative w-full h-[75vh] md:h-[85vh] lg:h-[92vh] bg-black overflow-hidden">
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
          <SwiperSlide key={slide.id} className="relative">
            {/* Media (Video or Image) */}
            {(index === 0 || showAllMedia) && (
              <SlideMedia
                slide={slide}
                isFirst={index === 0}
                onLoad={index === 0 ? () => setFirstImageDone(true) : undefined}
              />
            )}

            {/* Gradient overlay — bottom-heavy like Adidas */}
            <div className="absolute inset-0 hero-gradient" />

            {/* Content */}
            <SlideContent
              slide={slide}
              isActive={index === activeIndex}
              onSelect={() => trackSelectPromotion(toPromotion(slide, index))}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Slider controls — bottom right corner */}
      {!singleSlide && (
        <div className="absolute bottom-5 right-5 md:bottom-6 md:right-6 lg:bottom-8 lg:right-8 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/40 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors"
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => swiperRef.current?.slidePrev()}
            aria-label="Previous slide"
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/40 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => swiperRef.current?.slideNext()}
            aria-label="Next slide"
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/40 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
