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
import { APP_NAME } from '@/utils/constants';
import { bannersApi } from '@/api/pages.api';

const fallbackSlides: HeroBannerSlide[] = [
  {
    id: 1,
    eyebrow: 'New Season',
    title: 'THE NEW\nCOLLECTION',
    subtitle: 'Discover the latest styles designed for those who dare to stand out.',
    linkUrl: '/category/new-arrivals',
    buttonText: 'Shop Now',
  },
];

export default function HomePage() {
  const { data: bannersData } = useQuery({
    queryKey: ['banners', 'hero'],
    queryFn: () => bannersApi.getActive('hero'),
    staleTime: 5 * 60 * 1000,
  });

  const heroSlides: HeroBannerSlide[] = useMemo(() => {
    const banners = bannersData?.data;
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
  }, [bannersData]);

  return (
    <>
      <Helmet>
        <title>{APP_NAME} | Premium Fashion & Apparel</title>
        <meta name="description" content="Discover the latest in fashion and apparel at My Brand. Premium clothing, shoes, and accessories." />
      </Helmet>

      <HeroBanner slides={heroSlides} />
      <FeaturedCollections />
      <ShopByCollection />
      <TrendingProducts />
      <StillInterested />
      <BrandStory />
      <NewsletterSection />
    </>
  );
}
