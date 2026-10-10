import { Link } from 'react-router-dom';
import NewsletterSection from '@/components/home/NewsletterSection';

/** Shown on a category/collection page that has no products yet, with an email signup. */
export default function ComingSoon({ name }: { name: string }) {
  return (
    <div className="mt-6 mb-12">
      <NewsletterSection
        title="Coming Soon"
        subtitle={`We're getting ${name} ready. Sign up and we'll let you know as soon as it drops.`}
      />
      <div className="mt-8 text-center">
        <Link
          to="/collections/new-arrivals"
          className="text-xs font-heading font-bold uppercase tracking-wider border-b-2 border-brand-black pb-0.5 hover:text-gray-600 transition-colors"
        >
          Shop New Arrivals
        </Link>
      </div>
    </div>
  );
}
