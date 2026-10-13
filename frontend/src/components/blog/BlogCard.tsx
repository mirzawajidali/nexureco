import { Link } from 'react-router-dom';
import { NewspaperIcon } from '@heroicons/react/24/outline';
import type { BlogPostSummary } from '@/types/blog';
import TitleText from './TitleText';
import { formatPostDate } from '@/utils/blog';
import { imageSrcSet } from '@/utils/image';

interface BlogCardProps {
  post: BlogPostSummary;
  /** `sizes` for the cover image: how wide the card is at each breakpoint */
  sizes?: string;
  /** Heading level: h3 under a section's h2 (default), h2 on the blog page */
  headingLevel?: 'h2' | 'h3';
}

/** Story card: cover, "CATEGORY / DATE", title, excerpt and a Read more link (same look as the collection cards) */
export default function BlogCard({ post, sizes = '(max-width: 640px) 80vw, (max-width: 1024px) 50vw, 25vw', headingLevel = 'h3' }: BlogCardProps) {
  const Heading = headingLevel;
  return (
    <Link to={`/blog/${post.slug}`} className="group block p-2 -m-2 border border-transparent hover:border-black transition-colors">
      <div className="relative overflow-hidden bg-[#eceff1] aspect-[4/3]">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            srcSet={imageSrcSet(post.cover_image_url)}
            sizes={sizes}
            alt={post.cover_image_alt ?? ''}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <NewspaperIcon className="w-14 h-14 text-gray-300" />
          </div>
        )}
      </div>

      <div className="pt-4">
        <p className="blog-meta text-gray-600">
          {[post.category, formatPostDate(post.published_at)].filter(Boolean).join(' / ')}
        </p>
        <Heading className="type-card-title text-black mt-2 line-clamp-2">
          <TitleText title={post.title} />
        </Heading>
        {post.excerpt && <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-2">{post.excerpt}</p>}
        <span className="inline-block mt-4 text-xs font-heading font-bold uppercase tracking-wider text-black border-b-2 border-black pb-0.5 group-hover:border-gray-400 transition-colors">
          Read more
        </span>
      </div>
    </Link>
  );
}
