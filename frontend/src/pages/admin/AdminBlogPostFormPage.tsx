import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ArrowUpTrayIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { adminMediaApi } from '@/api/admin.api';
import { adminBlogApi } from '@/api/blog.api';
import type { BlogPostAdmin, BlogPostInput } from '@/types/blog';
import { BLOG_CATEGORIES, blogPostStatus } from '@/utils/blog';
import { resizedImage } from '@/utils/image';
import { SITE_NAME, TITLE_SUFFIX } from '@/utils/constants';

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  cover_image_alt: string;
  category: string;
  author_name: string;
  is_published: boolean;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
  /** YYYY-MM-DD in the admin's time zone */
  publish_date: string;
}

const EMPTY: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  cover_image_alt: '',
  category: '',
  author_name: SITE_NAME,
  is_published: false,
  is_featured: false,
  meta_title: '',
  meta_description: '',
  publish_date: '',
};

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const input =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400';
const card = 'bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4';
const cardTitle = 'text-[13px] font-semibold text-gray-500 uppercase tracking-wider';

/** Roughly what the server will make the URL (it has the final say, and keeps URLs unique) */
function slugPreview(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

const pad = (n: number) => String(n).padStart(2, '0');

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The picked day at local midnight, as an ISO timestamp the API stores in UTC */
const fromDateInput = (value: string) => (value ? new Date(`${value}T00:00`).toISOString() : null);

function toForm(post: BlogPostAdmin): FormState {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    content: post.content ?? '',
    cover_image_url: post.cover_image_url ?? '',
    cover_image_alt: post.cover_image_alt ?? '',
    category: post.category ?? '',
    author_name: post.author_name ?? SITE_NAME,
    is_published: post.is_published,
    is_featured: post.is_featured,
    meta_title: post.meta_title ?? '',
    meta_description: post.meta_description ?? '',
    publish_date: toDateInput(post.published_at),
  };
}

function Counter({ value, max, ideal }: { value: string; max: number; ideal?: [number, number] }) {
  const n = value.length;
  const off = n > max || (ideal && n > 0 && (n < ideal[0] || n > ideal[1]));
  return (
    <span className={`text-xs ${off ? 'text-amber-600' : 'text-gray-400'}`}>
      {n}/{ideal ? `${ideal[0]}–${ideal[1]}` : max}
    </span>
  );
}

export default function AdminBlogPostFormPage() {
  const { id } = useParams<{ id: string }>();
  const postId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugEdited, setSlugEdited] = useState(false);
  const [dateEdited, setDateEdited] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: ['admin-blog-post', postId],
    queryFn: () => adminBlogApi.get(postId!),
    enabled: postId !== null,
  });
  const { data: allPosts = [] } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: () => adminBlogApi.list(),
  });

  useEffect(() => {
    if (post) {
      setForm(toForm(post));
      setSlugEdited(false);
      setDateEdited(false);
    }
  }, [post]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const categories = Array.from(
    new Set([...BLOG_CATEGORIES, ...allPosts.map((p) => p.category).filter((c): c is string => !!c)])
  );

  function payload(): BlogPostInput {
    const data: BlogPostInput = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content || null,
      cover_image_url: form.cover_image_url || null,
      cover_image_alt: form.cover_image_alt.trim() || null,
      category: form.category.trim() || null,
      author_name: form.author_name.trim() || null,
      is_published: form.is_published,
      is_featured: form.is_featured,
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      published_at: fromDateInput(form.publish_date),
    };
    if (postId === null || slugEdited) data.slug = form.slug.trim() || undefined;
    // An untouched date keeps the exact publish time already saved
    if (postId !== null && !dateEdited) delete (data as Partial<BlogPostInput>).published_at;
    return data;
  }

  const save = useMutation({
    mutationFn: () => (postId === null ? adminBlogApi.create(payload()) : adminBlogApi.update(postId, payload())),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      queryClient.setQueryData(['admin-blog-post', saved.id], saved);
      const status = blogPostStatus(saved);
      toast.success(status === 'published' ? 'Post published' : status === 'scheduled' ? 'Post scheduled' : 'Draft saved');
      if (postId === null) navigate(`/admin/blog/${saved.id}`, { replace: true });
      else setForm(toForm(saved));
      setSlugEdited(false);
      setDateEdited(false);
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Could not save the post. Check the fields and try again.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Add a title');
      return;
    }
    save.mutate();
  }

  async function upload(file: File) {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error('Use a JPG, PNG, WebP or AVIF image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('The image is over 5 MB');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminMediaApi.upload(fd);
      const url = (res.data as { url?: string })?.url;
      if (url) set('cover_image_url', url);
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  if (postId !== null && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (postId !== null && !isLoading && !post) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 text-sm mb-3">This post doesn't exist anymore.</p>
        <Link to="/admin/blog" className="text-sm text-blue-600 hover:underline">
          Back to Blog
        </Link>
      </div>
    );
  }

  const slug = slugEdited || postId !== null ? form.slug : slugPreview(form.title);
  const seoTitle = `${form.meta_title.trim() || form.title.trim() || 'Post title'} | ${TITLE_SUFFIX}`;
  const seoDescription = form.meta_description.trim() || form.excerpt.trim();
  const status = post ? blogPostStatus(post) : null;

  return (
    <>
      <Helmet>
        <title>{postId === null ? 'New post' : 'Edit post'} | Admin</title>
      </Helmet>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/admin/blog" className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Back to Blog">
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {postId === null ? 'New post' : 'Edit post'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {status === 'published' && (
              <a
                href={`/blog/${post!.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <EyeIcon className="h-4 w-4" />
                View
              </a>
            )}
            <button
              type="submit"
              disabled={save.isPending || uploading}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {save.isPending ? 'Saving...' : form.is_published ? (status === 'published' ? 'Save' : 'Publish') : 'Save draft'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4">
            <div className={card}>
              <div>
                <label htmlFor="post-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title
                </label>
                <input
                  id="post-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  maxLength={200}
                  required
                  placeholder="e.g. How to Style an Oversized T-Shirt"
                  className={input}
                />
              </div>

              <div>
                <label htmlFor="post-slug" className="block text-sm font-medium text-gray-700 mb-1.5">
                  URL
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
                    /blog/
                  </span>
                  <input
                    id="post-slug"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      set('slug', e.target.value);
                    }}
                    maxLength={220}
                    placeholder="made-from-the-title"
                    className={`${input} rounded-l-none font-mono`}
                  />
                </div>
                {postId !== null && slugEdited && form.slug !== post?.slug && (
                  <p className="text-xs text-amber-600 mt-1">
                    Changing the URL breaks links to this post that are already shared or indexed by Google.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="post-excerpt" className="block text-sm font-medium text-gray-700">
                    Excerpt
                  </label>
                  <Counter value={form.excerpt} max={500} ideal={[120, 200]} />
                </div>
                <textarea
                  id="post-excerpt"
                  value={form.excerpt}
                  onChange={(e) => set('excerpt', e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="A short teaser shown on blog cards and the homepage slider"
                  className={`${input} resize-y`}
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1.5">Content</p>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <RichTextEditor
                    content={form.content}
                    onChange={(html) => set('content', html)}
                    placeholder="Write the article. Use Heading 2 for sections and Heading 3 for sub-sections."
                  />
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className={card}>
              <p className={cardTitle}>Search engine listing</p>
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50">
                <p className="text-xs text-gray-500 truncate">nexureco.com › blog › {slug || 'post-url'}</p>
                <p className="text-[17px] text-[#1a0dab] leading-snug truncate">{seoTitle}</p>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {seoDescription || 'Add a meta description or an excerpt to control this text.'}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="post-meta-title" className="block text-sm font-medium text-gray-700">
                    Meta title
                  </label>
                  <span className={`text-xs ${seoTitle.length > 60 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {seoTitle.length}/60 with "| {TITLE_SUFFIX}"
                  </span>
                </div>
                <input
                  id="post-meta-title"
                  type="text"
                  value={form.meta_title}
                  onChange={(e) => set('meta_title', e.target.value)}
                  maxLength={200}
                  placeholder="Keyword-led title (defaults to the post title)"
                  className={input}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="post-meta-description" className="block text-sm font-medium text-gray-700">
                    Meta description
                  </label>
                  <Counter value={form.meta_description} max={500} ideal={[140, 160]} />
                </div>
                <textarea
                  id="post-meta-description"
                  value={form.meta_description}
                  onChange={(e) => set('meta_description', e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Defaults to the excerpt"
                  className={`${input} resize-y`}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className={card}>
              <p className={cardTitle}>Publishing</p>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span>
                  <span className="block text-sm font-medium text-gray-700">Published</span>
                  <span className="block text-xs text-gray-500">Off keeps it as a draft only admins can see</span>
                </span>
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => set('is_published', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span>
                  <span className="block text-sm font-medium text-gray-700">Featured</span>
                  <span className="block text-xs text-gray-500">Shown first in the homepage blog slider</span>
                </span>
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => set('is_featured', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
              </label>
              <div>
                <label htmlFor="post-date" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Publish date
                </label>
                <input
                  id="post-date"
                  type="date"
                  value={form.publish_date}
                  onChange={(e) => {
                    setDateEdited(true);
                    set('publish_date', e.target.value);
                  }}
                  className={input}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Empty: the day you publish. A future date schedules the post.
                </p>
              </div>
            </div>

            <div className={card}>
              <p className={cardTitle}>Cover image</p>
              {form.cover_image_url ? (
                <div className="relative">
                  <img
                    src={resizedImage(form.cover_image_url, 640)}
                    alt=""
                    className="w-full aspect-[4/3] object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => set('cover_image_url', '')}
                    className="absolute top-2 right-2 p-1 bg-white/90 rounded-md shadow hover:bg-white"
                    aria-label="Remove cover image"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-700" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) upload(file);
                  }}
                  disabled={uploading}
                  className="w-full aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-gray-400 disabled:opacity-60"
                >
                  <ArrowUpTrayIcon className="h-6 w-6" />
                  <span className="text-sm">{uploading ? 'Uploading...' : 'Upload or drop an image'}</span>
                  <span className="text-xs text-gray-400">Landscape, at least 1200 × 800 px</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={ALLOWED_EXT.join(',')}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file);
                  e.target.value = '';
                }}
              />
              <div>
                <label htmlFor="post-cover-alt" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Image description (alt text)
                </label>
                <input
                  id="post-cover-alt"
                  type="text"
                  value={form.cover_image_alt}
                  onChange={(e) => set('cover_image_alt', e.target.value)}
                  maxLength={300}
                  placeholder="e.g. Man in a black oversized tee and cargo pants"
                  className={input}
                />
              </div>
              {!form.cover_image_url && (
                <p className="text-xs text-amber-600">
                  Posts without a cover image look empty in the blog slider and when shared on WhatsApp or Facebook.
                </p>
              )}
            </div>

            <div className={card}>
              <p className={cardTitle}>Details</p>
              <div>
                <label htmlFor="post-category" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category
                </label>
                <input
                  id="post-category"
                  type="text"
                  list="blog-categories"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Style Guide"
                  className={input}
                />
                <datalist id="blog-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="post-author" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Author
                </label>
                <input
                  id="post-author"
                  type="text"
                  value={form.author_name}
                  onChange={(e) => set('author_name', e.target.value)}
                  maxLength={100}
                  className={input}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
