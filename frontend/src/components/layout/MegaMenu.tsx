import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import type { BannerData } from '@/api/pages.api';
import { megaColumns, type MegaColumn, type NavLink } from '@/utils/navigation';
import { imageSrcSet, resizedImage } from '@/utils/image';

interface MegaMenuProps {
  id: string;
  link: NavLink;
  open: boolean;
  /** Campaign tiles under the first column (the homepage hero slides) */
  promos?: BannerData[];
  onNavigate: () => void;
}

const LEFT = 'w-[24%] shrink-0 pr-10';
const GRID = 'flex-1 grid grid-cols-4 gap-x-8 pl-12';

function Column({ column, onNavigate }: { column: MegaColumn; onNavigate: () => void }) {
  const { heading } = column;
  return (
    <div>
      {heading &&
        (heading.href ? (
          <Link
            to={heading.href}
            target={heading.target}
            onClick={onNavigate}
            className="block mb-4 font-heading font-bold uppercase text-[15px] tracking-[0.02em] hover:underline underline-offset-4"
          >
            {heading.label}
          </Link>
        ) : (
          <p className="mb-4 font-heading font-bold uppercase text-[15px] tracking-[0.02em]">{heading.label}</p>
        ))}
      <ul className="space-y-3">
        {column.links.map((l) => (
          <li key={`${l.label}-${l.href}`}>
            <Link
              to={l.href!}
              target={l.target}
              onClick={onNavigate}
              className={clsx('text-[15px] hover:underline underline-offset-4', l.accent && 'text-brand-accent')}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Full-width dropdown under the header (Adidas-style): a featured first column with campaign tiles and a
 * divider, the other columns beside it, and an "All …" row along the bottom. It stays in the DOM while
 * closed (display: none), so the links are still there for crawlers.
 */
export default function MegaMenu({ id, link, open, promos, onNavigate }: MegaMenuProps) {
  const columns = megaColumns(link);
  if (columns.length === 0) return null;
  // With two or more columns the first is the featured one on the left, beside a divider
  const featured = columns.length > 1 ? columns[0] : null;
  const rest = featured ? columns.slice(1) : columns;
  const tiles = (promos ?? []).filter((b) => b.image_url && b.link_url).slice(0, 2);

  return (
    <div
      id={id}
      className={clsx(
        'absolute inset-x-0 top-full z-40 bg-white border-t border-gray-200 shadow-[0_16px_24px_-16px_rgba(0,0,0,0.2)]',
        open ? 'block' : 'hidden',
      )}
    >
      <div className="container-custom flex">
        {featured && (
          <div className={clsx(LEFT, 'py-10 border-r border-gray-200')}>
            <Column column={featured} onNavigate={onNavigate} />
            {tiles.length > 0 && (
              <div className="mt-6 space-y-4">
                {tiles.map((b) => (
                  <Link
                    key={b.id}
                    to={b.link_url!}
                    onClick={onNavigate}
                    className="group relative block w-full max-w-[220px] aspect-[12/5] overflow-hidden bg-brand-black"
                  >
                    <img
                      src={resizedImage(b.image_url!, 480)}
                      srcSet={imageSrcSet(b.image_url!, [320, 480])}
                      sizes="220px"
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    <span className="absolute left-3 right-3 bottom-2.5 font-display uppercase text-white text-lg leading-none">
                      {b.title}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        <div className={clsx(GRID, 'py-10 gap-y-10')}>
          {rest.map((column, i) => (
            <Column key={column.heading?.label ?? i} column={column} onNavigate={onNavigate} />
          ))}
        </div>
      </div>

      {/* "All …" links under their columns */}
      <div className="border-t border-gray-200">
        <div className="container-custom flex">
          {featured && (
            <div className={clsx(LEFT, 'py-4')}>
              {link.href && (
                <Link to={link.href} onClick={onNavigate} className="font-heading font-bold text-[15px] hover:underline underline-offset-4">
                  All {link.label}
                </Link>
              )}
            </div>
          )}
          <div className={clsx(GRID, 'py-4')}>
            {rest.map((column, i) => (
              <div key={column.heading?.label ?? i}>
                {column.heading?.href && (
                  <Link
                    to={column.heading.href}
                    onClick={onNavigate}
                    className="font-heading font-bold text-[15px] hover:underline underline-offset-4"
                  >
                    All {column.heading.label}
                  </Link>
                )}
              </div>
            ))}
            {!featured && link.href && (
              <Link to={link.href} onClick={onNavigate} className="font-heading font-bold text-[15px] hover:underline underline-offset-4">
                All {link.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
