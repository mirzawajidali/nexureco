import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import Spinner from '@/components/ui/Spinner';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import BlogCard from '@/components/blog/BlogCard';
import TitleText from '@/components/blog/TitleText';
import { blogApi } from '@/api/blog.api';
import type { BlogPost, BlogPostSummary } from '@/types/blog';
import { formatPostDate } from '@/utils/blog';
import { imageSrcSet, resizedImage } from '@/utils/image';
import { truncateText } from '@/utils/formatters';
import { blogPostingStructuredData, breadcrumbStructuredData, htmlToText } from '@/utils/seo';
import { cleanHtml } from '@/utils/sanitize';
import { SITE_NAME, SITE_URL } from '@/utils/constants';

/** "October 2026": the article header shows the month, like Adidas Stories */
const monthYear = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';

function ShareLinks({ post }: { post: BlogPost }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const text = post.title;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const image = post.cover_image_url ? encodeURIComponent(`${SITE_URL}${post.cover_image_url}`) : '';
  const links = [
    {
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.737-.9 10.125-5.864 10.125-11.854z" />
        </svg>
      ),
    },
    {
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      icon: (
        <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Save on Pinterest',
      href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}${image ? `&media=${image}` : ''}`,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
        </svg>
      ),
    },
    {
      label: 'Share on WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      icon: <WhatsAppIcon className="w-5 h-5" />,
    },
    {
      label: 'Share by email',
      href: `mailto:?subject=${t}&body=${u}`,
      icon: <EnvelopeIcon className="w-6 h-6" aria-hidden="true" />,
    },
  ];

  return (
    <ul className="flex items-center gap-1" aria-label="Share this story">
      {links.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            target={link.href.startsWith('mailto:') ? undefined : '_blank'}
            rel="noopener noreferrer"
            aria-label={link.label}
            title={link.label}
            className="w-10 h-10 flex items-center justify-center text-black hover:text-gray-500 transition-colors"
          >
            {link.icon}
          </a>
        </li>
      ))}
    </ul>
  );
}

function LatestStories({ posts }: { posts: BlogPostSummary[] }) {
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="latest-stories">
      <h2 id="latest-stories" className="font-bold uppercase text-lg tracking-wide">
        Latest Stories
      </h2>
      <ul className="mt-5">
        {posts.map((p, i) => (
          <li key={p.id} className={i > 0 ? 'border-t border-gray-400' : ''}>
            <Link to={`/blog/${p.slug}`} className="group flex gap-3 py-4">
              <div className="w-16 h-24 flex-shrink-0 bg-[#eceff1] overflow-hidden">
                {p.cover_image_url && (
                  <img src={resizedImage(p.cover_image_url, 160)} alt="" className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>
              <div className="min-w-0">
                <p className="blog-meta text-gray-700">
                  {p.category ? `${p.category} /` : ''}
                  <br />
                  {formatPostDate(p.published_at)}
                </p>
                <p className="mt-2 text-sm font-bold leading-snug group-hover:underline underline-offset-2 line-clamp-3">
                  {p.title}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => blogApi.get(slug!),
    enabled: !!slug,
    retry: false,
  });
  const { data: latest } = useQuery({
    queryKey: ['blog-posts', 'latest'],
    queryFn: () => blogApi.list({ limit: 4 }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="container-custom section-padding min-h-[60vh]">
        <Helmet>
          <title>Post Not Found</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="text-center py-20">
          <h1 className="type-display mb-4">Post Not Found</h1>
          <p className="text-gray-500 text-sm mb-8">This story doesn't exist or is no longer published.</p>
          <Link
            to="/blog"
            className="inline-block bg-brand-black text-white px-8 py-3 font-heading font-bold uppercase text-sm tracking-wider hover:bg-gray-800 transition-colors"
          >
            Read the blog
          </Link>
        </div>
      </div>
    );
  }

  const description =
    post.meta_description || post.excerpt || truncateText(htmlToText(post.content || ''), 160);
  const latestStories = (latest?.items ?? []).filter((p) => p.id !== post.id).slice(0, 3);

  // Links inside the article stay in the app (no full page load) unless they open elsewhere
  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const link = (e.target as HTMLElement).closest('a');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = link.getAttribute('href');
    if (link.target === '_blank' || !href || !href.startsWith('/') || href.startsWith('//')) return;
    e.preventDefault();
    navigate(href);
  }

  return (
    <>
      <Helmet>
        {/* Same title rule as seo_service._blog_post_head: the meta title, else the post title */}
        <title>{post.meta_title || post.title}</title>
        <meta name="description" content={description} />
        <script type="application/ld+json">{JSON.stringify(blogPostingStructuredData(post, description))}</script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbStructuredData([['Blog', '/blog'], [post.title, `/blog/${post.slug}`]]))}
        </script>
      </Helmet>

      <article>
        {post.cover_image_url && (
          <div className="relative w-full max-w-[1920px] mx-auto aspect-[4/3] md:aspect-[3/1] bg-[#eceff1] overflow-hidden">
            <img
              src={post.cover_image_url}
              srcSet={imageSrcSet(post.cover_image_url)}
              sizes="100vw"
              alt={post.cover_image_alt ?? ''}
              className="absolute inset-0 w-full h-full object-cover"
              fetchPriority="high"
            />
          </div>
        )}

        <div className="container-custom">
          <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16 xl:gap-24">
            <div className="min-w-0 max-w-[50rem]">
              {/* Meta row: brand / month / reading time, then share links */}
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 border-b border-gray-400">
                <p className="blog-meta text-black">
                  {[SITE_NAME, monthYear(post.published_at), `${post.reading_minutes}-minute read`]
                    .filter(Boolean)
                    .join(' / ')}
                </p>
                <ShareLinks post={post} />
              </div>

              <h1 className="blog-title mt-8 md:mt-10"><TitleText title={post.title} /></h1>
              {post.excerpt && <p className="blog-lede mt-6">{post.excerpt}</p>}

              {/* Admin-written HTML, sanitized again here; clicks on its links are handled above */}
              <div
                className="blog-content mt-8 pb-12"
                onClick={handleContentClick}
                dangerouslySetInnerHTML={{ __html: cleanHtml(post.content) }}
              />
            </div>

            <aside className="pb-12 lg:pt-16 space-y-10 lg:sticky lg:top-24 lg:self-start">
              <LatestStories posts={latestStories} />
              {post.category && (
                <section aria-labelledby="post-tags">
                  <h2 id="post-tags" className="font-bold uppercase text-lg tracking-wide">
                    Tags
                  </h2>
                  <Link
                    to={`/blog?category=${encodeURIComponent(post.category)}`}
                    className="inline-block mt-2 text-xs font-bold uppercase tracking-[2px] underline underline-offset-2 hover:text-gray-500"
                  >
                    {post.category}
                  </Link>
                </section>
              )}
            </aside>
          </div>
        </div>
      </article>

      {post.related.length > 0 && (
        <section className="bg-[#fafafa] section-padding" aria-labelledby="related-stories">
          <div className="container-custom">
            <h2 id="related-stories" className="type-section mb-8">
              You May Also Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-6">
              {post.related.map((p) => (
                <BlogCard key={p.id} post={p} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
              ))}
            </div>
          </div>
        </section>
      )}

    </>
  );
}
