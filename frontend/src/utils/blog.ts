import type { BlogPostAdmin } from '@/types/blog';

/** Suggested in Admin → Blog; the admin can type any other category */
export const BLOG_CATEGORIES = ['Style Guide', 'Fit & Sizing', 'Fabric & Care', 'Shopping Guide'];

export type BlogPostStatus = 'published' | 'scheduled' | 'draft';

/** A published post with a future publish date is scheduled: the storefront shows it from that date */
export function blogPostStatus(post: Pick<BlogPostAdmin, 'is_published' | 'published_at'>): BlogPostStatus {
  if (!post.is_published) return 'draft';
  return post.published_at && new Date(post.published_at) > new Date() ? 'scheduled' : 'published';
}

/** "12 October 2026" */
export function formatPostDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
