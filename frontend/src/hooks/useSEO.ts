/**
 * Hook for managing SEO and structured data (JSON-LD)
 * Provides utilities for adding schema markup to pages
 */

import { useEffect } from 'react';

interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface ProductData {
  name: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
  brand?: string;
  sku?: string;
  rating?: number;
  reviewCount?: number;
}

interface OrganizationData {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

/**
 * Add JSON-LD structured data to document head
 */
const addStructuredData = (data: any) => {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
  
  return () => {
    document.head.removeChild(script);
  };
};

/**
 * Generate breadcrumb schema
 */
export const useBreadcrumbSchema = (breadcrumbs: BreadcrumbItem[]) => {
  useEffect(() => {
    const domain = window.location.origin;
    const items = breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${domain}${item.url}` : domain,
    }));

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items,
    };

    return addStructuredData(schema);
  }, [breadcrumbs]);
};

/**
 * Generate product schema
 */
export const useProductSchema = (product: ProductData) => {
  useEffect(() => {
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: product.image,
      description: product.description,
      ...(product.sku && { sku: product.sku }),
      ...(product.brand && { brand: { '@type': 'Brand', name: product.brand } }),
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency,
        availability: 'https://schema.org/InStock',
        url: window.location.href,
      },
    };

    if (product.rating && product.reviewCount) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
      };
    }

    return addStructuredData(schema);
  }, [product]);
};

/**
 * Generate organization schema
 */
export const useOrganizationSchema = (org: OrganizationData) => {
  useEffect(() => {
    const schema: any = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: org.name,
      url: org.url,
      ...(org.logo && { logo: org.logo }),
      ...(org.description && { description: org.description }),
    };

    if (org.sameAs && org.sameAs.length > 0) {
      schema.sameAs = org.sameAs;
    }

    return addStructuredData(schema);
  }, [org]);
};

/**
 * Generate collection/category schema
 */
export const useCollectionSchema = (collection: {
  name: string;
  description?: string;
  image?: string;
  url: string;
}) => {
  useEffect(() => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: collection.name,
      description: collection.description,
      url: window.location.href,
      ...(collection.image && { image: collection.image }),
    };

    return addStructuredData(schema);
  }, [collection]);
};

/**
 * Generate FAQ schema
 */
export const useFAQSchema = (
  faqs: Array<{ question: string; answer: string }>
) => {
  useEffect(() => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };

    return addStructuredData(schema);
  }, [faqs]);
};

/**
 * Generate local business schema
 */
export const useLocalBusinessSchema = (business: {
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  url: string;
  image?: string;
}) => {
  useEffect(() => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': business.type,
      name: business.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: business.address.split(',')[0],
        addressLocality: business.address.split(',')[1],
      },
      telephone: business.phone,
      email: business.email,
      url: business.url,
      ...(business.image && { image: business.image }),
    };

    return addStructuredData(schema);
  }, [business]);
};

/**
 * Set page structured data helper
 */
export const usePageSchema = (schemaData: any) => {
  useEffect(() => {
    return addStructuredData(schemaData);
  }, [schemaData]);
};
