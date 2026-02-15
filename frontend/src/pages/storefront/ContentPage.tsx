import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import Spinner from '@/components/ui/Spinner';
import { pagesApi } from '@/api/pages.api';
import { APP_NAME } from '@/utils/constants';

interface PageData {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

export default function ContentPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['page', slug],
    queryFn: () => pagesApi.getBySlug(slug!).then((res) => res.data as PageData),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container-custom section-padding min-h-[60vh]">
        <div className="text-center py-20">
          <h1 className="text-heading-sm font-heading uppercase mb-4">Page Not Found</h1>
          <p className="text-gray-500 text-sm mb-8">
            The page you're looking for doesn't exist or has been unpublished.
          </p>
          <Link
            to="/"
            className="inline-block bg-brand-black text-white px-8 py-3 font-heading font-bold uppercase text-sm tracking-wider hover:bg-gray-800 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{data.meta_title || data.title} | {APP_NAME}</title>
        {data.meta_description && (
          <meta name="description" content={data.meta_description} />
        )}
      </Helmet>

      <div className="container-custom section-padding">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-gray-500 mb-8">
          <Link to="/" className="hover:text-brand-black transition-colors">
            Home
          </Link>
          <ChevronRightIcon className="h-3 w-3" />
          <span className="text-brand-black">{data.title}</span>
        </nav>

        {/* Page Title */}
        <h1 className="text-heading-lg font-heading uppercase mb-8">
          {data.title}
        </h1>

        {/* Page Content */}
        {data.content ? (
          <div
            className="prose prose-sm max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-wider prose-a:text-brand-black prose-a:underline"
            dangerouslySetInnerHTML={{ __html: data.content }}
          />
        ) : (
          <p className="text-gray-500 text-sm">This page has no content yet.</p>
        )}
      </div>
    </>
  );
}
