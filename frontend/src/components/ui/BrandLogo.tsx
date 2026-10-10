import { Link } from 'react-router-dom';
// 96px-tall WebP (2x the largest displayed size); logo.png is kept for the PDF reports
import logoSrc from '@/assets/images/logo.webp';
import { SITE_NAME } from '@/utils/constants';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  linkTo?: string;
}

const sizeClasses = {
  sm: 'h-6',
  md: 'h-8 lg:h-10',
  lg: 'h-10 lg:h-12',
};

export default function BrandLogo({ size = 'md', variant = 'dark', linkTo = '/' }: BrandLogoProps) {
  const logo = (
    <img
      src={logoSrc}
      alt={SITE_NAME}
      width={203}
      height={40}
      className={`${sizeClasses[size]} w-auto flex-shrink-0`}
      style={variant === 'light' ? { filter: 'invert(1)' } : undefined}
    />
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex items-center flex-shrink-0">
        {logo}
      </Link>
    );
  }

  return logo;
}
