import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice } from '@/utils/formatters';
import { imageSrcSet, resizedImage } from '@/utils/image';
import { shortProductName } from '@/utils/seo';
import {
  productToItem,
  trackAddToWishlist,
  trackRemoveFromWishlist,
  trackSelectItem,
  type ItemList,
} from '@/utils/analytics';

/**
 * Card title: the name without the brand and without the material ("100% Cotton Jersey"), which every
 * tee shares, so cards are told apart by what differs. The full name stays in the image alt text,
 * on the product page and in search results.
 */
function cardName(name: string): string {
  return shortProductName(name).replace(/\s*\b\d+%\s+[A-Za-z]+(?:\s+jersey)?\b/i, '').trim() || name;
}

interface ProductCardProps {
  id: number;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  image?: string | null;
  categoryName?: string | null;
  variantCount?: number;
  variantImages?: string[];
  // Colour name of each variant image, used as its alt text
  variantColors?: (string | null)[];
  isNew?: boolean;
  isBestSeller?: boolean;
  /** GA4 list this card is shown in, and its position — reported on select_item */
  list?: ItemList;
  index?: number;
}

export default function ProductCard({
  id,
  name,
  slug,
  price,
  compareAtPrice,
  image,
  categoryName,
  variantCount = 0,
  variantImages = [],
  variantColors = [],
  isNew = false,
  isBestSeller = false,
  list,
  index,
}: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const wishlisted = isInWishlist(id);
  const analyticsItem = () =>
    productToItem({ id, name, base_price: price, category_name: categoryName }, { index });
  const handleSelect = () => trackSelectItem(analyticsItem(), list);
  const hasDiscount = compareAtPrice && compareAtPrice > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / compareAtPrice) * 100) : 0;
  const [hoveredVariant, setHoveredVariant] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const displayImage = hoveredVariant !== null ? variantImages[hoveredVariant] : image;
  const hasVariantStrip = variantImages.length > 1;

  const updateScrollState = () => {
    const el = stripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  const scrollStrip = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="group relative p-2 -m-2 border border-transparent hover:border-black transition-colors">
      {/* Image area — portrait ratio like Adidas cards */}
      <Link to={`/product/${slug}`} onClick={handleSelect} className="block aspect-square bg-[#eceff1] overflow-hidden relative">
        {displayImage ? (
          <img
            src={displayImage}
            srcSet={imageSrcSet(displayImage, [320, 480, 640, 960, 1280])}
            alt={name}
            width={600}
            height={600}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Discount badge — top left (same rounding as the product page's "-40%") */}
        {discountPercent > 0 && (
          <span className="absolute top-2 left-2 z-10 bg-sale text-white text-xs font-bold px-2 py-1">
            -{discountPercent}%
          </span>
        )}

        {/* Wishlist button — top right; a 44px tap target with a white disc so it reads on any photo */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            (wishlisted ? trackRemoveFromWishlist : trackAddToWishlist)([analyticsItem()]);
            toggleWishlist(id);
          }}
          className="absolute top-1.5 right-1.5 z-10 w-11 h-11 flex items-center justify-center"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wishlisted}
        >
          <span className="w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center transition-colors group-hover:bg-white">
            {wishlisted ? (
              <HeartSolid className="h-[18px] w-[18px] text-brand-black" />
            ) : (
              <HeartIcon className="h-[18px] w-[18px] text-brand-black" />
            )}
          </span>
        </button>
      </Link>

      {/* Variant thumbnail strip — appears on hover, below image */}
      {hasVariantStrip && (
        <div
          className="relative overflow-hidden max-h-0 group-hover:max-h-24 transition-all duration-300"
          onMouseEnter={updateScrollState}
        >
          <div
            ref={stripRef}
            onScroll={updateScrollState}
            className="flex gap-1 overflow-x-auto scrollbar-hide scroll-smooth pt-1"
          >
            {variantImages.map((vImg, idx) => (
              <Link
                key={idx}
                to={`/product/${slug}`}
                onClick={handleSelect}
                onMouseEnter={() => setHoveredVariant(idx)}
                onMouseLeave={() => setHoveredVariant(null)}
                className="relative flex-shrink-0 group/thumb"
              >
                <img
                  src={resizedImage(vImg, 160)}
                  alt={variantColors[idx] ?? ''}
                  width={56}
                  height={64}
                  className="w-14 h-16 object-cover bg-[#eceff1]"
                  loading="lazy"
                />
                {/* Active indicator line */}
                <div
                  className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4/5 h-[2px] transition-colors duration-150 ${
                    hoveredVariant === idx ? 'bg-brand-black' : 'bg-transparent'
                  }`}
                />
                {/* Tooltip on hover — shows product name */}
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap bg-brand-black text-white text-xs font-medium px-2 py-1 opacity-0 group-hover/thumb:opacity-100 transition-opacity z-20">
                  {cardName(name)}
                </span>
              </Link>
            ))}
          </div>

          {/* Scroll arrows */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                scrollStrip(-1);
              }}
              aria-label="Scroll variants left"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-16 bg-white/95 border border-gray-300 flex items-center justify-center hover:bg-gray-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                scrollStrip(1);
              }}
              aria-label="Scroll variants right"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-16 bg-white/95 border border-gray-300 flex items-center justify-center hover:bg-gray-50"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Product info */}
      <Link to={`/product/${slug}`} onClick={handleSelect} className="block pt-3 space-y-0.5">
        {/* Price */}
        <div className="flex items-center gap-2">
          <span className={hasDiscount ? 'type-product-name text-sale' : 'type-product-name'}>{formatPrice(price)}</span>
          {hasDiscount && (
            <span className="text-sm text-gray-600 line-through">
              {formatPrice(compareAtPrice)}
            </span>
          )}
        </div>

        {/* Product name */}
        <h3 className="type-product-name mt-1 line-clamp-2" title={name}>
          {cardName(name)}
        </h3>

        {/* Category */}
        {categoryName && (
          <p className="text-xs text-gray-600">{categoryName}</p>
        )}

        {/* Colors count */}
        {variantCount > 1 && (
          <p className="text-xs text-gray-600">
            {variantCount} color{variantCount !== 1 ? 's' : ''}
          </p>
        )}

        {/* Best seller / New label */}
        {isBestSeller && (
          <p className="text-xs font-bold text-brand-black mt-1">Best seller</p>
        )}
        {isNew && !isBestSeller && (
          <p className="text-xs font-bold text-brand-black mt-1">New</p>
        )}
      </Link>
    </div>
  );
}
