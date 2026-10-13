import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import BlogCard from '@/components/blog/BlogCard';
import TitleText from '@/components/blog/TitleText';
import Pagination from '@/components/ui/Pagination';
import Spinner from '@/components/ui/Spinner';
import { blogApi } from '@/api/blog.api';
import type { BlogPostSummary } from '@/types/blog';
import { formatPostDate } from '@/utils/blog';
import { imageSrcSet } from '@/utils/image';
import { breadcrumbStructuredData } from '@/utils/seo';
import { PAGE_SEO } from '@/utils/constants';

const PAGE_SIZE = 12;

/** The newest story, large: photo beside the copy (stacked on phones) */
function LeadStory({ post }: { post: BlogPostSummary }) {
  return (
    <Link to={`/blog/${post.slug}`} className="group grid md:grid-cols-[3fr_2fr] gap-6 md:gap-10 items-center">
      <div className="relative overflow-hidden bg-[#eceff1] aspect-[4/3] md:aspect-[3/2]">
        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            srcSet={imageSrcSet(post.cover_image_url)}
            sizes="(max-width: 768px) 100vw, 60vw"
            alt={post.cover_image_alt ?? ''}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
            fetchPriority="high"
          />
        )}
      </div>
      <div>
        <p className="blog-meta text-gray-600">
          {[post.category, formatPostDate(post.published_at)].filter(Boolean).join(' / ')}
        </p>
        <h2 className="type-section mt-3">
          <TitleText title={post.title} />
        </h2>
        {post.excerpt && <p className="mt-4 text-gray-700 leading-relaxed">{post.excerpt}</p>}
        <span className="inline-block mt-6 text-xs font-heading font-bold uppercase tracking-wider text-black border-b-2 border-black pb-0.5 group-hover:border-gray-400 transition-colors">
          Read more
        </span>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || undefined;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const { data, isLoading } = useQuery({
    queryKey: ['blog-posts', 'list', category ?? '', page],
    queryFn: () => blogApi.list({ page, limit: PAGE_SIZE, category }),
    placeholderData: keepPreviousData,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: blogApi.categories,
    staleTime: 10 * 60 * 1000,
  });

  const posts = data?.items ?? [];
  // The first page of "All" leads with the newest story, large
  const lead = !category && page === 1 ? posts[0] : undefined;
  const grid = lead ? posts.slice(1) : posts;

  function goTo(next: { category?: string; page?: number }) {
    const params = new URLSearchParams();
    if (next.category) params.set('category', next.category);
    if (next.page && next.page > 1) params.set('page', String(next.page));
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  }

  const chip = (active: boolean) =>
    `px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${
      active ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:border-black'
    }`;

  return (
    <>
      <Helmet>
        <title>{PAGE_SEO.blog.title}</title>
        <meta name="description" content={PAGE_SEO.blog.description} />
        <script type="application/ld+json">{JSON.stringify(breadcrumbStructuredData([['Blog', '/blog']]))}</script>
      </Helmet>

      <div className="container-custom section-padding">
        <header className="max-w-3xl">
          <span className="text-xs font-heading font-bold uppercase tracking-[0.25em] text-gray-600 mb-3 block">
            Stories &amp; Guides
          </span>
          <h1 className="type-display">{PAGE_SEO.blog.title}</h1>
          <p className="mt-4 text-gray-700 leading-relaxed">{PAGE_SEO.blog.description}</p>
        </header>

        {categories.length > 1 && (
          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Blog categories">
            <button type="button" onClick={() => goTo({})} className={chip(!category)} aria-pressed={!category}>
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => goTo({ category: c.name })}
                className={chip(category === c.name)}
                aria-pressed={category === c.name}
              >
                {c.name}
              </button>
            ))}
          </nav>
        )}

        <div className="mt-10 md:mt-12">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-600">No stories here yet.</p>
              {category && (
                <button type="button" onClick={() => goTo({})} className="mt-4 text-sm font-bold underline underline-offset-2">
                  See all stories
                </button>
              )}
            </div>
          ) : (
            <>
              {lead && (
                <div className="pb-12 mb-12 border-b border-gray-200">
                  <LeadStory post={lead} />
                </div>
              )}
              {grid.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
                  {grid.map((post) => (
                    <BlogCard
                      key={post.id}
                      post={post}
                      headingLevel="h2"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ))}
                </div>
              )}
              {data && data.pages > 1 && (
                <div className="mt-12">
                  <Pagination currentPage={page} totalPages={data.pages} onPageChange={(p) => goTo({ category, page: p })} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
