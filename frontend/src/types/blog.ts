/** A blog card (listing, homepage slider, related posts). Dates are ISO strings in UTC. */
export interface BlogPostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category: string | null;
  author_name: string | null;
  reading_minutes: number;
  is_featured: boolean;
  published_at: string | null;
}

export interface BlogPost extends BlogPostSummary {
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string | null;
  related: BlogPostSummary[];
}

export interface BlogPostAdmin extends BlogPostSummary {
  content: string | null;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BlogPostList {
  items: BlogPostSummary[];
  total: number;
  page: number;
  pages: number;
}

export interface BlogCategory {
  name: string;
  count: number;
}

/** What the admin form saves (POST creates, PUT updates) */
export interface BlogPostInput {
  title: string;
  slug?: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category: string | null;
  author_name: string | null;
  is_published: boolean;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  /** YYYY-MM-DD; empty = when it's first published */
  published_at: string | null;
}
