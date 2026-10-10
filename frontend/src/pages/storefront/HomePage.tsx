import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import HeroBanner from '@/components/home/HeroBanner';
import type { HeroBannerSlide } from '@/components/home/HeroBanner';
import FeaturedCollections from '@/components/home/FeaturedCollections';
import ShopByCollection from '@/components/home/ShopByCollection';
import TrendingProducts from '@/components/home/TrendingProducts';
import BrandStory from '@/components/home/BrandStory';
import NewsletterSection from '@/components/home/NewsletterSection';
import StillInterested from '@/components/home/StillInterested';
import MarqueeStrip from '@/components/home/MarqueeStrip';
import PromoStrip from '@/components/home/PromoStrip';
import { getHeroBanners } from '@/api/pages.api';
import { HOME_DESCRIPTION, SITE_NAME } from '@/utils/constants';

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
      <h1 className="sr-only">{`${SITE_NAME} — Premium Cotton T-Shirts in Pakistan`}</h1>

      <HeroBanner slides={heroSlides} />
      <MarqueeStrip variant="dark" />
      <ShopByCollection />
      <PromoStrip
        eyebrow="Members Only"
        title="Unlock 15% Off Your First Drop"
        subtitle="Join the club for early access, exclusive releases, and free delivery perks."
        ctaText="Join free"
        ctaLink="/register"
        variant="accent"
      />
      <TrendingProducts />
      <StillInterested />
      <MarqueeStrip variant="light" speed="fast" />
      <BrandStory />
      <FeaturedCollections />
      <NewsletterSection />
    </>
  );
}
