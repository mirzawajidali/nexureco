import client from './client';
import type {
  BlogCategory,
  BlogPost,
  BlogPostAdmin,
  BlogPostInput,
  BlogPostList,
} from '@/types/blog';

export const blogApi = {
  list: (params: { page?: number; limit?: number; category?: string; featured_first?: boolean } = {}) =>
    client.get<BlogPostList>('/blog/posts', { params }).then((res) => res.data),
  get: (slug: string) => client.get<BlogPost>(`/blog/posts/${slug}`).then((res) => res.data),
  categories: () => client.get<BlogCategory[]>('/blog/categories').then((res) => res.data),
};

/** Admin → Blog (needs the "content" module, like Pages and Banners) */
export const adminBlogApi = {
  list: (search?: string) =>
    client.get<BlogPostAdmin[]>('/admin/blog/posts', { params: search ? { search } : undefined }).then((res) => res.data),
  get: (id: number) => client.get<BlogPostAdmin>(`/admin/blog/posts/${id}`).then((res) => res.data),
  create: (data: BlogPostInput) => client.post<BlogPostAdmin>('/admin/blog/posts', data).then((res) => res.data),
  update: (id: number, data: Partial<BlogPostInput>) =>
    client.put<BlogPostAdmin>(`/admin/blog/posts/${id}`, data).then((res) => res.data),
  delete: (id: number) => client.delete(`/admin/blog/posts/${id}`),
};
