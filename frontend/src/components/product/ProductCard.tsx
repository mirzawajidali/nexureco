import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice } from '@/utils/formatters';

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
  isNew?: boolean;
  isBestSeller?: boolean;
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
  isNew = false,
  isBestSeller = false,
}: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const wishlisted = isInWishlist(id);
  const hasDiscount = compareAtPrice && compareAtPrice > price;
  const [hoveredVariant, setHoveredVariant] = useState<number | null>(null);

  // Determine which image to show (hovered variant or primary)
  const displayImage = hoveredVariant !== null ? variantImages[hoveredVariant] : image;

  return (
    <div className="group relative">
      {/* Image area — portrait ratio like Adidas cards */}
      <Link to={`/product/${slug}`} className="block aspect-[3/4] bg-[#eceff1] overflow-hidden relative">
        {displayImage ? (
          <img
            src={displayImage}
            alt={name}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Wishlist button — top right */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(id);
          }}
          className="absolute top-3 right-3 z-10"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {wishlisted ? (
            <HeartSolid className="h-7 w-7 text-brand-black drop-shadow-sm" />
          ) : (
            <HeartIcon className="h-7 w-7 text-brand-black/80 hover:text-brand-black transition-colors drop-shadow-sm" />
          )}
        </button>

        {/* Variant color thumbnails — appear on hover at bottom of image */}
        {variantImages.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex justify-center gap-1 px-2 pb-2 pt-1">
              {variantImages.slice(0, 7).map((vImg, idx) => (
                <button
                  key={idx}
                  onMouseEnter={(e) => {
                    e.preventDefault();
                    setHoveredVariant(idx);
                  }}
                  onMouseLeave={() => setHoveredVariant(null)}
                  onClick={(e) => e.preventDefault()}
                  className="relative flex-shrink-0"
                >
                  <img
                    src={vImg}
                    alt=""
                    className="w-12 h-14 object-cover bg-[#eceff1]"
                  />
                  {/* Active indicator line */}
                  <div
                    className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4/5 h-[2px] transition-colors duration-150 ${
                      hoveredVariant === idx ? 'bg-brand-black' : 'bg-transparent'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </Link>

      {/* Product info */}
      <Link to={`/product/${slug}`} className="block pt-3 space-y-0.5">
        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-brand-black">{formatPrice(price)}</span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(compareAtPrice)}
            </span>
          )}
        </div>

        {/* Product name */}
        <h3 className="text-sm text-brand-black mt-1 line-clamp-2 leading-snug">
          {name}
        </h3>

        {/* Category */}
        {categoryName && (
          <p className="text-xs text-gray-500">{categoryName}</p>
        )}

        {/* Colors count */}
        {variantCount > 1 && (
          <p className="text-xs text-gray-500">
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
