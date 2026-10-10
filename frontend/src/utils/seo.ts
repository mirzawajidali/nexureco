import type { Product } from '@/types/product';
import { APP_NAME, SITE_NAME, SITE_URL } from './constants';
import { truncateText } from './formatters';

const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path}`);

/** Plain text from rich-text HTML (e.g. product descriptions). */
export function htmlToText(html: string): string {
  // Pad block-level tags with spaces so "<h3>Title</h3><p>Text" doesn't become "TitleText"
  const spaced = html.replace(/<\/?(p|div|br|li|ul|ol|h[1-6]|tr|td|th|blockquote)\b[^>]*>/gi, ' $& ');
  const doc = new DOMParser().parseFromString(spaced, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Product + Offer and BreadcrumbList JSON-LD for a product page. */
export function productStructuredData(product: Product) {
  const url = `${SITE_URL}/product/${product.slug}`;
  const variants = (product.variants ?? []).filter((v) => v.is_active);
  const inStock = variants.length > 0 ? variants.some((v) => v.stock_quantity > 0) : true;
  const images = [...product.images]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)
    .map((img) => absoluteUrl(img.url));
  const description = product.short_description || htmlToText(product.description || '');

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    ...(product.category_slug
      ? [{ name: product.category_name || product.category_slug, url: `${SITE_URL}/category/${product.category_slug}` }]
      : []),
    { name: product.name, url },
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${url}#product`,
        name: product.name,
        url,
        image: images,
        ...(description && { description: truncateText(description, 5000) }),
        sku: product.sku || String(product.id),
        brand: { '@type': 'Brand', name: SITE_NAME },
        ...(product.category_name && { category: product.category_name }),
        offers: {
          '@type': 'Offer',
          url,
          price: product.base_price,
          priceCurrency: 'PKR',
          availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: SITE_NAME },
        },
        ...(product.review_count > 0 && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.avg_rating,
            reviewCount: product.review_count,
          },
        }),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      },
    ],
  };
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
