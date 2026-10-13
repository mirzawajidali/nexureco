import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import { blogApi } from '@/api/blog.api';
import BlogCard from '@/components/blog/BlogCard';

const SLIDER_LIMIT = 8;

/** Homepage "From the Blog" slider: featured posts first, then the newest (same slider as Collections) */
export default function BlogStories() {
  const swiperRef = useRef<SwiperType | null>(null);

  const { data } = useQuery({
    queryKey: ['blog-posts', 'home'],
    queryFn: () => blogApi.list({ limit: SLIDER_LIMIT, featured_first: true }),
    staleTime: 5 * 60 * 1000,
  });

  const posts = data?.items ?? [];
  // Near the bottom of the page, so nothing below shifts while it loads: render once there are posts
  if (posts.length === 0) return null;

  const navButton =
    'w-11 h-11 flex items-center justify-center border-2 border-black text-black hover:bg-black hover:text-white transition-colors';

  return (
    // overflow-hidden: on mobile the slider shows a peek of the next card, which must not widen the page
    <section className="section-padding overflow-hidden" aria-labelledby="blog-stories-title">
      <div className="container-custom">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="text-xs font-heading font-bold uppercase tracking-[0.25em] text-gray-600 mb-3 block">
              Stories &amp; Guides
            </span>
            <h2 id="blog-stories-title" className="type-section">
              From the Blog
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/blog"
              className="mr-2 text-xs font-heading font-bold uppercase tracking-wider text-black border-b-2 border-black pb-0.5 hover:border-gray-400 transition-colors whitespace-nowrap"
            >
              View all
            </Link>
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => swiperRef.current?.slidePrev()}
              className={`hidden sm:flex ${navButton}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next story"
              onClick={() => swiperRef.current?.slideNext()}
              className={`hidden sm:flex ${navButton}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        <Swiper
          modules={[Pagination]}
          onSwiper={(s) => (swiperRef.current = s)}
          spaceBetween={12}
          slidesPerView={1.25}
          breakpoints={{
            640: { slidesPerView: 2, spaceBetween: 16 },
            1024: { slidesPerView: 3, spaceBetween: 20 },
            1280: { slidesPerView: 4, spaceBetween: 24 },
          }}
          pagination={{ clickable: true, el: '.blog-pagination' }}
          className="!overflow-visible sm:!overflow-hidden"
        >
          {posts.map((post) => (
            <SwiperSlide key={post.id} className="h-auto">
              <BlogCard post={post} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Same bars as the Collections slider (globals.css .collections-pagination) */}
        <div className="collections-pagination blog-pagination flex justify-center gap-2 mt-6 sm:hidden" />
      </div>
    </section>
  );
}
