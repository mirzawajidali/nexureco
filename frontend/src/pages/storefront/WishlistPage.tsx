import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import { useWishlistStore } from '@/store/wishlistStore';
import { useCartStore } from '@/store/cartStore';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import { productsApi, type ProductListItem } from '@/api/products.api';
import { formatPrice } from '@/utils/formatters';
import { APP_NAME } from '@/utils/constants';
import Button from '@/components/ui/Button';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Spinner from '@/components/ui/Spinner';
import ProductCard from '@/components/product/ProductCard';
import toast from 'react-hot-toast';

function WishlistCard({
  product,
  onRemove,
  onMoveToBag,
}: {
  product: ProductListItem;
  onRemove: () => void;
  onMoveToBag: () => void;
}) {
  const [hoveredVariant, setHoveredVariant] = useState<number | null>(null);
  const hasDiscount =
    product.compare_at_price && product.compare_at_price > product.base_price;
  const displayImage =
    hoveredVariant !== null
      ? product.variant_images[hoveredVariant]
      : product.primary_image;

  return (
    <div className="group relative">
      {/* Image — portrait ratio matching ProductCard */}
      <Link
        to={`/product/${product.slug}`}
        className="block aspect-[3/4] bg-[#eceff1] overflow-hidden relative"
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-brand-accent text-white text-[11px] font-bold px-2 py-0.5">
            -{Math.round(((product.compare_at_price! - product.base_price) / product.compare_at_price!) * 100)}%
          </span>
        )}

        {/* Remove from wishlist */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-3 right-3 z-10"
          aria-label="Remove from wishlist"
        >
          <HeartSolid className="h-7 w-7 text-brand-black drop-shadow-sm" />
        </button>

        {/* Variant color thumbnails on hover */}
        {product.variant_images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <div className="flex justify-center gap-1 px-2 pb-2 pt-1">
              {product.variant_images.slice(0, 7).map((vImg, idx) => (
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
                  <div
                    className={clsx(
                      'absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4/5 h-[2px] transition-colors duration-150',
                      hoveredVariant === idx
                        ? 'bg-brand-black'
                        : 'bg-transparent',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </Link>

      {/* Product info */}
      <div className="pt-3 space-y-0.5">
        <Link to={`/product/${product.slug}`} className="block space-y-0.5">
          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-brand-black">
              {formatPrice(product.base_price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.compare_at_price!)}
              </span>
            )}
          </div>

          {/* Name */}
          <h3 className="text-sm text-brand-black mt-1 line-clamp-2 leading-snug">
            {product.name}
          </h3>

          {/* Category */}
          {product.category_name && (
            <p className="text-xs text-gray-500">{product.category_name}</p>
          )}

          {/* Colors count */}
          {product.variant_count > 1 && (
            <p className="text-xs text-gray-500">
              {product.variant_count} color
              {product.variant_count !== 1 ? 's' : ''}
            </p>
          )}
        </Link>

        {/* Move to Bag button */}
        <button
          onClick={onMoveToBag}
          className="mt-3 w-full h-[44px] flex items-center justify-between px-4 text-xs font-bold uppercase tracking-wider bg-brand-black text-white hover:bg-gray-800 transition-colors"
        >
          <span>Move to bag</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function RecentlyViewedSection({ excludeIds }: { excludeIds: number[] }) {
  const recentIds = useRecentlyViewedStore((s) => s.productIds);
  const filteredIds = recentIds.filter((id) => !excludeIds.includes(id)).slice(0, 8);

  const { data } = useQuery({
    queryKey: ['recently-viewed-wishlist', filteredIds.join(',')],
    queryFn: () => productsApi.list({ ids: filteredIds.join(','), page_size: 8 }),
    enabled: filteredIds.length > 0,
  });

  const products = data?.data?.items ?? [];

  if (products.length === 0) return null;

  return (
    <section className="container-custom pb-16">
      <div className="border-t border-gray-200 pt-12 mt-4">
        <h2 className="text-heading-lg font-heading uppercase mb-8">
          Recently Viewed
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              slug={p.slug}
              price={p.base_price}
              compareAtPrice={p.compare_at_price}
              image={p.primary_image}
              categoryName={p.category_name}
              variantCount={p.variant_count}
              variantImages={p.variant_images}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function WishlistPage() {
  const { productIds, removeFromWishlist } = useWishlistStore();
  const { addItem, setCartOpen } = useCartStore();

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist-products', productIds],
    queryFn: () => productsApi.list({ ids: productIds.join(','), page_size: 50 }),
    enabled: productIds.length > 0,
  });

  const products = data?.data?.items || [];

  const handleMoveToCart = (product: ProductListItem) => {
    addItem({
      productId: product.id,
      variantId: null,
      quantity: 1,
      name: product.name,
      price: product.base_price,
      image: product.primary_image || '',
    });
    removeFromWishlist(product.id);
    toast.success('Moved to bag');
    setCartOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Wishlist | {APP_NAME}</title>
      </Helmet>

      <div className="container-custom py-8">
        <Breadcrumb items={[{ label: 'Wishlist' }]} />

        <h1 className="text-heading-xl font-heading uppercase mb-1">
          Wishlist
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          {productIds.length} item{productIds.length !== 1 ? 's' : ''} saved
        </p>

        {productIds.length === 0 ? (
          <div className="text-center py-20">
            <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-6" />
            <p className="text-heading font-heading uppercase mb-2">
              Your wishlist is empty
            </p>
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
              Save items you love for later by clicking the heart icon on any
              product.
            </p>
            <Link to="/">
              <Button variant="primary" size="lg">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {products.map((product) => (
              <WishlistCard
                key={product.id}
                product={product}
                onRemove={() => {
                  removeFromWishlist(product.id);
                  toast.success('Removed from wishlist');
                }}
                onMoveToBag={() => handleMoveToCart(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recently Viewed — excludes items already in wishlist */}
      <RecentlyViewedSection excludeIds={productIds} />
    </>
  );
}
