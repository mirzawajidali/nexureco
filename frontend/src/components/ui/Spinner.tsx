import { clsx } from 'clsx';
import loaderSrc from '@/assets/images/loader.webp';
import loaderStillSrc from '@/assets/images/loader-still.webp';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Loading indicator. Page and section loaders (md, lg) show the animated Nexure icon (transparent, brand
 * black; a still icon for visitors who prefer reduced motion); sm stays a small spinner for inline use.
 */
export default function Spinner({ size = 'md', className }: SpinnerProps) {
  if (size !== 'sm') {
    return (
      <span role="status" className={clsx('inline-flex', className)}>
        <picture>
          <source srcSet={loaderStillSrc} media="(prefers-reduced-motion: reduce)" />
          <img
            src={loaderSrc}
            alt=""
            width={114}
            height={119}
            className={clsx('block w-auto', size === 'lg' ? 'h-16' : 'h-10')}
          />
        </picture>
        <span className="sr-only">Loading</span>
      </span>
    );
  }

  return (
    <svg
      className={clsx('animate-spin text-brand-black h-4 w-4', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
