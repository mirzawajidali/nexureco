import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

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
    linkUrl: '/category/new-arrivals',
    buttonText: 'Shop Now',
  },
];

function SlideMedia({ slide, isFirst }: { slide: HeroBannerSlide; isFirst: boolean }) {
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

  return (
    <>
      {/* Desktop image */}
      <img
        src={slide.imageUrl}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover ${
          slide.mobileImageUrl ? 'hidden md:block' : ''
        }`}
        loading="eager"
        fetchPriority={isFirst ? 'high' : undefined}
        sizes="100vw"
      />
      {/* Mobile image (if provided) */}
      {slide.mobileImageUrl && (
        <img
          src={slide.mobileImageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover md:hidden"
          loading="eager"
          fetchPriority={isFirst ? 'high' : undefined}
          sizes="100vw"
        />
      )}
    </>
  );
}

function SlideContent({ slide, isActive }: { slide: HeroBannerSlide; isActive: boolean }) {
  const centered = slide.textAlign === 'center';

  return (
    <div className="relative h-full flex items-end z-10">
      <div className={`container-custom w-full pb-16 md:pb-20 lg:pb-24 ${centered ? 'text-center' : ''}`}>
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
            <Link to={slide.linkUrl} className="hero-btn hero-btn-primary group">
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
              <Link to={slide.secondaryLinkUrl} className="hero-btn hero-btn-outline group">
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

  const onSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
  }, []);

  const singleSlide = slides.length <= 1;

  return (
    <section className="relative w-full h-[75vh] md:h-[85vh] lg:h-[92vh] bg-black overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={800}
        autoplay={singleSlide ? false : { delay: autoplayDelay, disableOnInteraction: false, pauseOnMouseEnter: true }}
        pagination={singleSlide ? false : { clickable: true, el: '.hero-pagination' }}
        loop={!singleSlide}
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        onSlideChange={onSlideChange}
        className="h-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={slide.id} className="relative">
            {/* Media (Video or Image) */}
            <SlideMedia slide={slide} isFirst={index === 0} />

            {/* Gradient overlay — bottom-heavy like Adidas */}
            <div className="absolute inset-0 hero-gradient" />

            {/* Content */}
            <SlideContent slide={slide} isActive={index === activeIndex} />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom pagination */}
      {!singleSlide && (
        <div className="hero-pagination absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2" />
      )}

      {/* Prev / Next arrows (desktop only) */}
      {!singleSlide && (
        <>
          <button
            onClick={() => swiperRef.current?.slidePrev()}
            className="hero-nav-btn left-4 lg:left-8"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => swiperRef.current?.slideNext()}
            className="hero-nav-btn right-4 lg:right-8"
            aria-label="Next slide"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </>
      )}
    </section>
  );
}
