import apiClient from './client';
import type { PaginatedResponse } from '@/types/common';
import type { Product, ProductFilters } from '@/types/product';

interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  base_price: number;
  compare_at_price: number | null;
  status: string;
  is_featured: boolean;
  avg_rating: number;
  review_count: number;
  total_sold: number;
  primary_image: string | null;
  category_name: string | null;
  variant_count: number;
  variant_images: string[];
  tags: string[] | null;
  created_at: string;
}

export type { ProductListItem };

export const productsApi = {
  list: (filters?: ProductFilters) =>
    apiClient.get<PaginatedResponse<ProductListItem>>('/products', { params: filters }),

  getBySlug: (slug: string) =>
    apiClient.get<Product>(`/products/${slug}`),

  featured: (limit = 8) =>
    apiClient.get<ProductListItem[]>('/products/featured', { params: { limit } }),

  newArrivals: (limit = 8) =>
    apiClient.get<ProductListItem[]>('/products/new-arrivals', { params: { limit } }),

  bestSellers: (limit = 8) =>
    apiClient.get<ProductListItem[]>('/products/best-sellers', { params: { limit } }),
};

export const searchApi = {
  search: (params: { q: string; page?: number; page_size?: number; category?: string; min_price?: number; max_price?: number; sort?: string }) =>
    apiClient.get<PaginatedResponse<ProductListItem>>('/search', { params }),

  suggestions: (q: string) =>
    apiClient.get<{ name: string; slug: string }[]>('/search/suggestions', { params: { q } }),
};

export const categoriesApi = {
  list: () =>
    apiClient.get('/categories'),

  getBySlug: (slug: string) =>
    apiClient.get(`/categories/${slug}`),

  getProducts: (slug: string, params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<ProductListItem>>(`/categories/${slug}/products`, { params }),
};

export const collectionsApi = {
  list: () =>
    apiClient.get('/collections'),

  featured: () =>
    apiClient.get('/collections/featured'),

  getBySlug: (slug: string) =>
    apiClient.get(`/collections/${slug}`),

  getProducts: (slug: string, params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<ProductListItem>>(`/collections/${slug}/products`, { params }),
};
