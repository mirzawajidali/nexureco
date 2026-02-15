import client from './client';
import type { User, Address } from '@/types/user';

export const userApi = {
  getProfile: () => client.get<User>('/users/me/profile'),
  updateProfile: (data: { first_name?: string; last_name?: string; phone?: string }) =>
    client.put<User>('/users/me/profile', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    client.put('/users/me/password', data),

  // Addresses
  listAddresses: () => client.get<Address[]>('/users/me/addresses'),
  createAddress: (data: Omit<Address, 'id' | 'created_at'>) =>
    client.post<Address>('/users/me/addresses', data),
  updateAddress: (id: number, data: Partial<Address>) =>
    client.put<Address>(`/users/me/addresses/${id}`, data),
  deleteAddress: (id: number) => client.delete(`/users/me/addresses/${id}`),
  setDefaultAddress: (id: number) =>
    client.put<Address>(`/users/me/addresses/${id}/default`),
};

export const wishlistApi = {
  list: () => client.get('/wishlist/'),
  add: (productId: number) => client.post('/wishlist/', { product_id: productId }),
  remove: (productId: number) => client.delete(`/wishlist/${productId}`),
};

export const reviewApi = {
  getProductReviews: (productId: number, page = 1) =>
    client.get(`/reviews/product/${productId}`, { params: { page } }),
  getReviewSummary: (productId: number) =>
    client.get(`/reviews/product/${productId}/summary`),
  create: (data: { product_id: number; rating: number; title?: string; comment?: string }) =>
    client.post('/reviews/', data),
};

export const newsletterApi = {
  subscribe: (email: string) => client.post('/newsletter/subscribe', { email }),
  unsubscribe: (email: string) => client.post('/newsletter/unsubscribe', { email }),
};
