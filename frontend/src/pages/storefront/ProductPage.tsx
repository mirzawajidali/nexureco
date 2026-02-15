import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeftIcon,
  HeartIcon,
  ChevronRightIcon,
  XMarkIcon,
  ChevronLeftIcon,
  MinusIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid, StarIcon } from '@heroicons/react/24/solid';
import { productsApi } from '@/api/products.api';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useRecentlyViewedStore } from '@/store/recentlyViewedStore';
import Spinner from '@/components/ui/Spinner';
import Accordion from '@/components/ui/Accordion';
import ZoomableImage from '@/components/ui/ZoomableImage';
import { formatPrice } from '@/utils/formatters';
import { APP_NAME } from '@/utils/constants';
import ReviewSection from '@/components/product/ReviewSection';
import ProductCard from '@/components/product/ProductCard';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import type { ProductOption } from '@/types/product';

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [showAllImages, setShowAllImages] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const { addItem, setCartOpen } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const addToRecentlyViewed = useRecentlyViewedStore((s) => s.addProduct);
  const recentlyViewedIds = useRecentlyViewedStore((s) => s.productIds);

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const product = data?.data;
  const wishlisted = product ? isInWishlist(product.id) : false;

  // Related products — same category, exclude current
  const { data: relatedData } = useQuery({
    queryKey: ['related-products', product?.category_slug, product?.id],
    queryFn: () =>
      productsApi.list({
        category: product?.category_slug ?? undefined,
        page_size: 9,
      }),
    enabled: !!product,
  });
  const relatedProducts = (relatedData?.data?.items ?? []).filter(
    (p) => p.id !== product?.id,
  ).slice(0, 8);

  // Track recently viewed products
  useEffect(() => {
    if (product?.id) addToRecentlyViewed(product.id);
  }, [product?.id, addToRecentlyViewed]);

  // Recently viewed products — "Still Interested?"
  const recentIds = product
    ? recentlyViewedIds.filter((id) => id !== product.id).slice(0, 8)
    : [];
  const { data: recentlyViewedData } = useQuery({
    queryKey: ['recently-viewed', recentIds.join(',')],
    queryFn: () => productsApi.list({ ids: recentIds.join(','), page_size: 8 }),
    enabled: recentIds.length > 0,
  });
  const recentlyViewedProducts = recentlyViewedData?.data?.items ?? [];

  // Find matching variant based on selected options
  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length || !product?.options?.length) return null;
    const selectedValueIds = Object.values(selectedOptions);
    if (selectedValueIds.length !== product.options.length) return null;

    return product.variants.find((v) => {
      const variantValueIds = v.option_values.map((ov) => ov.option_value_id);
      return selectedValueIds.every((id) => variantValueIds.includes(id));
    }) || null;
  }, [product, selectedOptions]);

  const currentPrice = selectedVariant?.price ?? product?.base_price ?? 0;
  const currentComparePrice = selectedVariant?.compare_at_price ?? product?.compare_at_price;
  const inStock = selectedVariant ? selectedVariant.stock_quantity > 0 : true;

  // Identify color option for thumbnail swatches
  const colorOption = useMemo(() => {
    return product?.options?.find(
      (opt) => opt.name.toLowerCase() === 'color' || opt.name.toLowerCase() === 'colour'
    );
  }, [product]);

  // Get variant images for color swatches — prefer variant image_url, fallback to product gallery
  const colorVariantImages = useMemo(() => {
    if (!colorOption || !product?.variants) return [];
    const galleryImages = product.images?.map((img) => img.url) || [];
    return colorOption.values.map((val, idx) => {
      const matchesColor = (v: typeof product.variants[number]) =>
        v.option_values.some((ov) => ov.option_value_id === val.id);
      const variantWithImage = product.variants.find(
        (v) => matchesColor(v) && v.image_url,
      );
      // Fallback: use gallery image by index if no variant image assigned
      const fallbackImage = galleryImages[idx] || galleryImages[0] || null;
      return {
        valueId: val.id,
        label: val.value,
        image: variantWithImage?.image_url || fallbackImage,
      };
    });
  }, [colorOption, product]);

  // Images to display
  const allImages = product?.images || [];
  const visibleImages = showAllImages ? allImages : allImages.slice(0, 4);

  // Lightbox navigation
  const lightboxOpen = lightboxIndex !== null;
  const goToPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);
  const goToNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [lightboxOpen, goToPrev, goToNext]);

  const handleAddToCart = () => {
    if (!product) return;
    const variantInfo = product.options
      .map((opt) => {
        const val = opt.values.find((v) => v.id === selectedOptions[opt.id]);
        return val ? `${opt.name}: ${val.value}` : null;
      })
      .filter(Boolean)
      .join(', ');

    addItem({
      productId: product.id,
      variantId: selectedVariant?.id || null,
      quantity,
      name: product.name,
      price: currentPrice,
      image: product.images?.[0]?.url || '',
      variantInfo: variantInfo || undefined,
    });
    toast.success('Added to bag');
    setCartOpen(true);
  };

  // Render option selector — color uses thumbnail swatches, others use grid buttons
  const renderOptionSelector = (option: ProductOption) => {
    const isColor = colorOption?.id === option.id;
    const selectedValueId = selectedOptions[option.id];
    const selectedLabel = option.values.find((v) => v.id === selectedValueId)?.value;

    return (
      <div key={option.id} className="mb-8">
        <h3 className="text-sm font-bold text-brand-black mb-4">
          {isColor ? 'Colors' : option.name}
        </h3>

        {isColor ? (
          <>
            <div className="flex gap-1">
              {colorVariantImages.map((cv) => (
                <button
                  key={cv.valueId}
                  onClick={() =>
                    setSelectedOptions((prev) => ({ ...prev, [option.id]: cv.valueId }))
                  }
                  className={clsx(
                    'w-[120px] aspect-[3/4] overflow-hidden transition-all',
                    selectedValueId === cv.valueId
                      ? 'border-b-[4px] border-brand-black'
                      : 'border-b-[4px] border-transparent hover:border-gray-300'
                  )}
                >
                  {cv.image ? (
                    <img src={cv.image} alt={cv.label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium">
                      {cv.label}
                    </div>
                  )}
                </button>
              ))}
            </div>
            {selectedLabel && (
              <p className="text-sm text-brand-black mt-2">{selectedLabel}</p>
            )}
          </>
        ) : (
          <div className="grid grid-cols-5 gap-[2px]">
            {option.values.map((val) => (
              <button
                key={val.id}
                onClick={() =>
                  setSelectedOptions((prev) => ({ ...prev, [option.id]: val.id }))
                }
                className={clsx(
                  'h-12 text-sm font-medium transition-colors text-center',
                  selectedValueId === val.id
                    ? 'border border-brand-black bg-white text-brand-black'
                    : 'border border-transparent bg-[#eceff1] hover:border-brand-black text-brand-black'
                )}
              >
                {val.value}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-custom py-16 text-center">
        <h1 className="text-heading-xl font-heading uppercase">Product Not Found</h1>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{product.meta_title || product.name} | {APP_NAME}</title>
        {product.meta_description && <meta name="description" content={product.meta_description} />}
      </Helmet>

      {/* Full-width layout: images flush left, sidebar padded right */}
      <div className="flex flex-col lg:flex-row">

        {/* Left — Image Gallery (flush to left edge) */}
        <div className="flex-1 min-w-0 relative">
          {/* Breadcrumb overlaid on top of images */}
          <nav className="absolute top-4 left-4 z-10 flex items-center gap-2 text-xs text-gray-500">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 hover:text-brand-black transition-colors"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              <span className="underline">Back</span>
            </button>
            <span className="mx-1">/</span>
            <Link to="/" className="hover:text-brand-black transition-colors underline">Home</Link>
            {product.category_name && (
              <>
                <ChevronRightIcon className="h-3 w-3" />
                <Link
                  to={`/category/${product.category_name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="hover:text-brand-black transition-colors underline"
                >
                  {product.category_name}
                </Link>
              </>
            )}
          </nav>

          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
              {visibleImages.map((img, idx) => (
                <ZoomableImage
                  key={img.id}
                  src={img.url}
                  alt={img.alt_text || `${product.name} - Image ${idx + 1}`}
                  className="aspect-[3/4] bg-[#eceff1]"
                  scale={2}
                  onClick={() => setLightboxIndex(idx)}
                  loading={idx < 2 ? 'eager' : 'lazy'}
                />
              ))}
            </div>

            {/* Show more / Show less — overlapping bottom of image grid */}
            {allImages.length > 4 && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-6 z-10">
                <button
                  onClick={() => setShowAllImages((prev) => !prev)}
                  className="flex items-center gap-2 px-8 py-3 border border-brand-black text-sm font-bold hover:bg-gray-50 transition-colors bg-white"
                >
                  {showAllImages ? 'Show less' : 'Show more'}
                  <svg
                    className={clsx('w-4 h-4 transition-transform duration-300', showAllImages && 'rotate-180')}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Accordion sections — centered within image column */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            {/* Reviews accordion */}
            <ReviewSection productId={product.id} />

            {/* Size and fit */}
            {product.size_and_fit && (
              <Accordion title="Size and fit">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Left: product image */}
                  {allImages.length > 1 && (
                    <div className="aspect-[3/4] bg-[#eceff1] overflow-hidden">
                      <img
                        src={allImages[Math.min(1, allImages.length - 1)].url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {/* Right: fit info */}
                  <div className="space-y-3">
                    {product.size_and_fit.fit_type && (
                      <p className="text-sm">
                        <span className="font-bold">True to size.</span>{' '}
                        {product.size_and_fit.fit_type}
                      </p>
                    )}
                    {product.size_and_fit.model_info && (
                      <p className="text-sm text-gray-600">
                        {product.size_and_fit.model_info}
                      </p>
                    )}
                    {product.size_and_fit.details && product.size_and_fit.details.length > 0 && (
                      <ul className="space-y-2 text-sm">
                        {product.size_and_fit.details.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 bg-brand-black rounded-full flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      onClick={() => setShowSizeGuide(true)}
                      className="text-sm font-bold underline cursor-pointer hover:text-gray-700 pt-2"
                    >
                      Size guide
                    </button>
                  </div>
                </div>
              </Accordion>
            )}

            {/* Description */}
            {product.description && (
              <Accordion title="Description">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div>
                    {product.short_description && (
                      <h4 className="text-sm font-heading font-bold uppercase tracking-wider leading-snug mb-4">
                        {product.short_description}
                      </h4>
                    )}
                    <div
                      className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  </div>
                  {allImages.length > 2 && (
                    <div className="aspect-[3/4] bg-[#eceff1] overflow-hidden">
                      <img
                        src={allImages[Math.min(2, allImages.length - 1)].url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              </Accordion>
            )}

            {/* Details — 2-column bullet list like Adidas */}
            <Accordion title="Details">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 text-sm">
                {product.sku && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-brand-black rounded-full flex-shrink-0" />
                    Product code: {product.sku}
                  </li>
                )}
                {product.weight && (
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-brand-black rounded-full flex-shrink-0" />
                    Weight: {product.weight}g
                  </li>
                )}
                {product.tags && product.tags.map((tag) => (
                  <li key={tag} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 bg-brand-black rounded-full flex-shrink-0" />
                    {tag}
                  </li>
                ))}
              </ul>
            </Accordion>

            {/* Care */}
            {product.care_instructions && (
              <Accordion title="Care">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Washing instructions */}
                  {product.care_instructions.washing && product.care_instructions.washing.length > 0 && (
                    <div>
                      <h4 className="text-sm font-heading font-bold uppercase tracking-wider mb-4">
                        Washing instructions
                      </h4>
                      <ul className="space-y-3">
                        {product.care_instructions.washing.map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-sm">
                            {item.icon && <span className="text-lg flex-shrink-0">{item.icon}</span>}
                            {item.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Extra care */}
                  {product.care_instructions.extra_care && product.care_instructions.extra_care.length > 0 && (
                    <div>
                      <h4 className="text-sm font-heading font-bold uppercase tracking-wider mb-4">
                        Extra care information
                      </h4>
                      <ul className="space-y-2">
                        {product.care_instructions.extra_care.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 w-1 h-1 bg-brand-black rounded-full flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Accordion>
            )}

            {/* Material */}
            {product.material_info && (
              <Accordion title="Material and Warmth">
                <div className="space-y-4 text-sm">
                  {product.material_info.composition && (
                    <p>
                      <span className="font-bold">Composition: </span>
                      {product.material_info.composition}
                    </p>
                  )}
                  {product.material_info.features && product.material_info.features.length > 0 && (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3">
                      {product.material_info.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 bg-brand-black rounded-full flex-shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Accordion>
            )}

            {/* Bottom border for last accordion */}
            <div className="border-t border-gray-200" />
          </div>
        </div>

        {/* Right — Sticky Product Info Sidebar */}
        <div className="lg:w-[420px] xl:w-[460px] flex-shrink-0 px-5 sm:px-6 lg:pl-10 lg:pr-10 xl:pr-14 pt-6 lg:pt-8">
          <div className="lg:sticky lg:top-8">
              {/* Category + Rating row */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  {product.category_name || 'Apparel'}
                </p>
                {product.review_count > 0 && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarIcon
                        key={i}
                        className={clsx(
                          'h-3.5 w-3.5',
                          i < Math.round(product.avg_rating) ? 'text-brand-black' : 'text-gray-300'
                        )}
                      />
                    ))}
                    <span className="text-xs text-gray-500 ml-1 underline cursor-pointer">{product.review_count}</span>
                  </div>
                )}
              </div>

              {/* Product Name */}
              <h1 className="text-[22px] leading-7 font-heading font-bold uppercase mb-3">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-base font-bold">{formatPrice(currentPrice)}</span>
                {currentComparePrice && currentComparePrice > currentPrice && (
                  <>
                    <span className="text-sm text-gray-400 line-through">
                      {formatPrice(currentComparePrice)}
                    </span>
                    <span className="badge-error text-xs">
                      -{Math.round(((currentComparePrice - currentPrice) / currentComparePrice) * 100)}%
                    </span>
                  </>
                )}
              </div>

              {/* Stock Status (below price) */}
              {selectedVariant && (
                <p className={clsx('text-xs mb-1', inStock ? 'text-success' : 'text-error')}>
                  {inStock
                    ? selectedVariant.stock_quantity <= selectedVariant.low_stock_threshold
                      ? `Only ${selectedVariant.stock_quantity} left in stock`
                      : 'In Stock'
                    : 'Out of Stock'}
                </p>
              )}

              {/* Spacer before options */}
              <div className="mt-8" />

              {/* Variant Selectors */}
              {product.options?.map((option) => renderOptionSelector(option))}

              {/* Size guide link (show for size-type options) */}
              {product.options?.some(
                (opt) => ['size', 'sizes'].includes(opt.name.toLowerCase())
              ) && (
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="text-sm font-bold underline mb-6 cursor-pointer hover:text-gray-700"
                >
                  Size guide
                </button>
              )}

              {/* True to size recommendation */}
              {product.options?.some(
                (opt) => ['size', 'sizes'].includes(opt.name.toLowerCase())
              ) && (
                <div className="bg-[#eceff1] rounded-md px-5 py-4 mb-8 flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <p className="text-sm">
                    <span className="font-bold">True to size.</span>{' '}
                    We recommend ordering your usual size.
                  </p>
                </div>
              )}

              {/* Quantity selector */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-sm font-bold text-brand-black">Quantity</span>
                <div className="flex items-center h-10 border border-gray-300">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <MinusIcon className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 h-full flex items-center justify-center text-sm font-bold border-x border-gray-300">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    className="w-10 h-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Add to Bag + Wishlist */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  className={clsx(
                    'flex-1 flex items-center justify-between px-6 h-[52px] text-sm font-bold uppercase tracking-wider transition-colors',
                    inStock
                      ? 'bg-brand-black text-white hover:bg-gray-800'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  )}
                >
                  <span>{inStock ? 'Add to bag' : 'Out of Stock'}</span>
                  {inStock && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="w-[52px] h-[52px] flex items-center justify-center border border-gray-300 hover:border-brand-black transition-colors flex-shrink-0"
                >
                  {wishlisted ? (
                    <HeartSolid className="h-5 w-5 text-brand-black" />
                  ) : (
                    <HeartIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Short description */}
              {product.short_description && (
                <p className="text-sm text-gray-600 leading-relaxed mt-6">
                  {product.short_description}
                </p>
              )}
          </div>
        </div>
      </div>

      {/* You may also like */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-gray-200 mt-12 pt-12 pb-16">
          <div className="container-custom">
            <h2 className="text-xl font-heading font-bold uppercase mb-8">
              You may also like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              {relatedProducts.slice(0, 4).map((rp) => (
                <ProductCard
                  key={rp.id}
                  id={rp.id}
                  name={rp.name}
                  slug={rp.slug}
                  price={rp.base_price}
                  compareAtPrice={rp.compare_at_price}
                  image={rp.primary_image}
                  categoryName={rp.category_name}
                  variantCount={rp.variant_count}
                  variantImages={rp.variant_images}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Still Interested? — Recently viewed */}
      {recentlyViewedProducts.length > 0 && (
        <div className="border-t border-gray-200 mt-12 pt-12 pb-16">
          <div className="container-custom">
            <h2 className="text-xl font-heading font-bold uppercase mb-8">
              Still interested?
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              {recentlyViewedProducts.slice(0, 4).map((rp) => (
                <ProductCard
                  key={rp.id}
                  id={rp.id}
                  name={rp.name}
                  slug={rp.slug}
                  price={rp.base_price}
                  compareAtPrice={rp.compare_at_price}
                  image={rp.primary_image}
                  categoryName={rp.category_name}
                  variantCount={rp.variant_count}
                  variantImages={rp.variant_images}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-[#eceff1] flex flex-col">
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center border border-gray-400 bg-white hover:border-brand-black transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-brand-black" />
          </button>

          {/* Main image area with arrows */}
          <div className="flex-1 flex items-center justify-center relative min-h-0">
            {/* Prev arrow */}
            <button
              onClick={goToPrev}
              className="absolute left-4 z-10 w-12 h-12 flex items-center justify-center border border-gray-400 bg-white hover:border-brand-black transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-brand-black" />
            </button>

            {/* Image with cursor-following zoom — fills entire available space */}
            <ZoomableImage
              key={lightboxIndex}
              src={allImages[lightboxIndex!].url}
              alt={allImages[lightboxIndex!].alt_text || product.name}
              className="w-full h-full bg-[#eceff1]"
              imgClassName="object-contain"
              scale={2.5}
            />

            {/* Next arrow */}
            <button
              onClick={goToNext}
              className="absolute right-4 z-10 w-12 h-12 flex items-center justify-center border border-gray-400 bg-white hover:border-brand-black transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-brand-black" />
            </button>
          </div>

          {/* Thumbnail strip at bottom */}
          <div className="flex justify-center gap-1 py-4 bg-white/60 backdrop-blur-sm">
            {allImages.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setLightboxIndex(idx)}
                className={clsx(
                  'w-16 h-16 flex-shrink-0 overflow-hidden border-2 transition-colors',
                  lightboxIndex === idx ? 'border-brand-black' : 'border-transparent hover:border-gray-300'
                )}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSizeGuide(false)} />
          <div className="relative bg-white max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-sm font-heading font-bold uppercase tracking-wider">Size Guide</h3>
              <button onClick={() => setShowSizeGuide(false)}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">
                Find your perfect fit. Measurements are in centimeters (cm).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left font-bold text-xs uppercase tracking-wider">Size</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-bold text-xs uppercase tracking-wider">Chest</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-bold text-xs uppercase tracking-wider">Waist</th>
                      <th className="border border-gray-200 px-3 py-2 text-center font-bold text-xs uppercase tracking-wider">Hips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['XS', '82-86', '66-70', '90-94'],
                      ['S', '86-90', '70-74', '94-98'],
                      ['M', '90-94', '74-78', '98-102'],
                      ['L', '94-98', '78-82', '102-106'],
                      ['XL', '98-102', '82-86', '106-110'],
                      ['2XL', '102-106', '86-90', '110-114'],
                    ].map(([size, chest, waist, hips]) => (
                      <tr key={size} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2 font-bold">{size}</td>
                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-600">{chest}</td>
                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-600">{waist}</td>
                        <td className="border border-gray-200 px-3 py-2 text-center text-gray-600">{hips}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 space-y-2 text-xs text-gray-500">
                <p><span className="font-bold text-brand-black">How to measure:</span> Use a soft measuring tape. Measure around the fullest part of your chest, the narrowest part of your waist, and the widest part of your hips.</p>
                <p>If you're between sizes, we recommend ordering the larger size.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
