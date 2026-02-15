import { APP_NAME } from './constants';

interface ProductJsonLd {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  sku?: string;
  availability?: 'InStock' | 'OutOfStock';
  rating?: { value: number; count: number };
  url: string;
}

export function generateProductJsonLd(product: ProductJsonLd): string {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    url: product.url,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency || 'PKR',
      availability: product.availability === 'OutOfStock'
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
  };

  if (product.sku) {
    data.sku = product.sku;
  }

  if (product.rating && product.rating.count > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating.value,
      reviewCount: product.rating.count,
    };
  }

  return JSON.stringify(data);
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

export function generateOrganizationJsonLd(baseUrl: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_NAME,
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
  });
}

export function generatePageTitle(page: string): string {
  return `${page} | ${APP_NAME}`;
}

export function generateMetaDescription(description: string, maxLength = 160): string {
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength - 3) + '...';
}
