import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import HeroBanner from '@/components/home/HeroBanner';
import type { HeroBannerSlide } from '@/components/home/HeroBanner';
import FeaturedCollections from '@/components/home/FeaturedCollections';
import ShopByCollection from '@/components/home/ShopByCollection';
import TrendingProducts from '@/components/home/TrendingProducts';
import BrandStory from '@/components/home/BrandStory';
import HomeSeoContent from '@/components/home/HomeSeoContent';
import BlogStories from '@/components/home/BlogStories';
import StillInterested from '@/components/home/StillInterested';
import PromoStrip from '@/components/home/PromoStrip';
import { getHeroBanners } from '@/api/pages.api';
import { HOME_DESCRIPTION, HOME_H1 } from '@/utils/constants';

const fallbackSlides: HeroBannerSlide[] = [
  {
    id: 1,
    eyebrow: 'New Season',
    title: 'THE NEW\nCOLLECTION',
    subtitle: 'Discover the latest styles designed for those who dare to stand out.',
    linkUrl: '/collections/new-arrivals',
    buttonText: 'Shop Now',
  },
];

export default function HomePage() {
  const { data: banners } = useQuery({
    queryKey: ['banners', 'hero'],
    queryFn: getHeroBanners,
    staleTime: 5 * 60 * 1000,
  });

  const heroSlides: HeroBannerSlide[] = useMemo(() => {
    if (!banners || banners.length === 0) return fallbackSlides;
    return banners.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle || undefined,
      imageUrl: b.image_url || undefined,
      mobileImageUrl: b.mobile_image_url || undefined,
      imageAlt: b.image_alt || undefined,
      linkUrl: b.link_url || '/',
      buttonText: b.button_text || 'Shop Now',
    }));
  }, [banners]);

  return (
    <>
      <Helmet>
        <meta name="description" content={HOME_DESCRIPTION} />
      </Helmet>

      {/* The page's single H1. The hero slides rotate (each headline is an h2), so the H1 names the store instead. */}
      <h1 className="sr-only">{HOME_H1}</h1>

      <HeroBanner slides={heroSlides} />
      <ShopByCollection />
      {/* No welcome discount (store policy, backend WELCOME_COUPON_CODE): only promise what an account gives */}
      <PromoStrip
        eyebrow="Members"
        title="Join the Nexure CO Club"
        subtitle="Track every order, save your delivery addresses and keep your wishlist on every device. Free to join."
        ctaText="Join free"
        ctaLink="/register"
        variant="accent"
      />
      <TrendingProducts />
      <StillInterested />
      <BrandStory />
      <FeaturedCollections />
      <BlogStories />
      <HomeSeoContent />
    </>
  );
}
