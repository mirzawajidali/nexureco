import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
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
  const [isPlaying, setIsPlaying] = useState(true);

  const onSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
  }, []);

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
