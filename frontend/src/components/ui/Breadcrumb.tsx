import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/20/solid';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center gap-1 text-xs text-gray-500 mb-6 ${className || ''}`}>
      <Link to="/" className="hover:text-brand-black transition-colors">
        Home
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRightIcon className="h-3 w-3" />
          {item.href ? (
            <Link to={item.href} className="hover:text-brand-black transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-brand-black font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
