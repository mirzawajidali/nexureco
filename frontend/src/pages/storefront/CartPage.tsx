import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  TrashIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  TruckIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/utils/formatters';
import { APP_NAME, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST } from '@/utils/constants';
import Breadcrumb from '@/components/ui/Breadcrumb';
import toast from 'react-hot-toast';

/* ── Single cart item row ── */
function CartItem({
  item,
  onRemove,
  onUpdateQty,
}: {
  item: { productId: number; variantId: number | null; quantity: number; name: string; slug: string; price: number; image: string; variantInfo?: string };
  onRemove: () => void;
  onUpdateQty: (qty: number) => void;
}) {
  return (
    <div className="flex gap-4 sm:gap-6 py-6">
      {/* Image */}
      <Link
        to={`/product/${item.slug}`}
        className="w-[100px] h-[130px] sm:w-[120px] sm:h-[156px] bg-[#eceff1] flex-shrink-0 overflow-hidden"
      >
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBagIcon className="w-8 h-8" />
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-brand-black leading-snug line-clamp-2">
                {item.name}
              </h3>
              {item.variantInfo && (
                <p className="text-xs text-gray-500 mt-1">{item.variantInfo}</p>
              )}
            </div>
            <p className="text-sm font-bold text-brand-black flex-shrink-0">
              {formatPrice(item.price * item.quantity)}
            </p>
          </div>

          {item.quantity > 1 && (
            <p className="text-xs text-gray-400 mt-1">
              {formatPrice(item.price)} each
            </p>
          )}
        </div>

        {/* Bottom: quantity + remove */}
        <div className="flex items-center justify-between mt-4">
          {/* Quantity stepper */}
          <div className="flex items-center h-10 border border-gray-300">
            <button
              onClick={() => onUpdateQty(item.quantity - 1)}
              className="w-10 h-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label="Decrease quantity"
            >
              <MinusIcon className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 h-full flex items-center justify-center text-sm font-bold border-x border-gray-300">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQty(item.quantity + 1)}
              className="w-10 h-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              aria-label="Increase quantity"
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Remove */}
          <button
            onClick={onRemove}
            className="p-2 text-gray-400 hover:text-brand-black transition-colors"
            aria-label="Remove item"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, couponCode, setCoupon, subtotal } =
    useCartStore();
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const total = subtotal();
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const shipping = total >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  const grandTotal = total + shipping;

  const handleApplyCoupon = () => {
    if (couponInput.trim()) {
      setCoupon(couponInput.trim().toUpperCase());
      toast.success('Coupon applied');
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponInput('');
    toast.success('Coupon removed');
  };

  return (
    <>
      <Helmet>
        <title>Shopping Bag | {APP_NAME}</title>
      </Helmet>

      <div className="container-custom py-8">
        <Breadcrumb items={[{ label: 'Shopping Bag' }]} />

        <h1 className="text-heading-xl font-heading uppercase mb-1">
          Your Bag
        </h1>
        {items.length > 0 && (
          <p className="text-sm text-gray-500 mb-8">
            {itemCount} item{itemCount !== 1 ? 's' : ''} &middot; {formatPrice(total)}
          </p>
        )}

        {items.length === 0 ? (
          /* ── Empty state ── */
          <div className="text-center py-20">
            <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-6" />
            <p className="text-heading font-heading uppercase mb-2">
              Your bag is empty
            </p>
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
              Once you add items to your bag, they will appear here. Start
              exploring to find your perfect style.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center bg-brand-black text-white px-10 py-4 font-heading font-bold uppercase text-xs tracking-wider hover:bg-gray-800 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* ── Left: Items ── */}
            <div className="flex-1 min-w-0">
              {/* Free shipping progress */}
              {total < FREE_SHIPPING_THRESHOLD && (
                <div className="bg-gray-50 px-5 py-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TruckIcon className="w-4 h-4 text-gray-600" />
                    <p className="text-xs font-bold text-brand-black uppercase tracking-wider">
                      You're {formatPrice(FREE_SHIPPING_THRESHOLD - total)} away from free shipping
                    </p>
                  </div>
                  <div className="w-full h-1 bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-brand-black transition-all duration-500"
                      style={{ width: `${Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {total >= FREE_SHIPPING_THRESHOLD && (
                <div className="bg-green-50 px-5 py-3 mb-6 flex items-center gap-2">
                  <TruckIcon className="w-4 h-4 text-green-700" />
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wider">
                    You qualify for free shipping!
                  </p>
                </div>
              )}

              {/* Items list */}
              <div className="divide-y divide-gray-200">
                {items.map((item) => (
                  <CartItem
                    key={`${item.productId}-${item.variantId}`}
                    item={item}
                    onRemove={() => {
                      removeItem(item.productId, item.variantId);
                      toast.success('Removed from bag');
                    }}
                    onUpdateQty={(qty) => updateQuantity(item.productId, item.variantId, qty)}
                  />
                ))}
              </div>

              {/* Bottom actions */}
              <div className="flex items-center justify-between pt-6 mt-2 border-t border-gray-200">
                <Link
                  to="/"
                  className="text-xs font-heading font-bold uppercase tracking-wider text-gray-500 hover:text-brand-black transition-colors"
                >
                  Continue Shopping
                </Link>
                <button
                  onClick={() => {
                    clearCart();
                    toast.success('Bag cleared');
                  }}
                  className="text-xs font-heading font-bold uppercase tracking-wider text-gray-500 hover:text-brand-accent transition-colors"
                >
                  Clear Bag
                </button>
              </div>
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="w-full lg:w-[380px] flex-shrink-0">
              <div className="lg:sticky lg:top-28">
                <div className="bg-gray-50 p-6">
                  <h2 className="text-sm font-heading font-bold uppercase tracking-wider mb-6">
                    Order Summary
                  </h2>

                  {/* Line items */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        {itemCount} Item{itemCount !== 1 ? 's' : ''}
                      </span>
                      <span className="font-bold">{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery</span>
                      <span className={`font-bold ${shipping === 0 ? 'text-green-700' : ''}`}>
                        {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                      </span>
                    </div>
                  </div>

                  {/* Coupon */}
                  <div className="mt-5 pt-5 border-t border-gray-200">
                    {couponCode ? (
                      <div className="flex items-center justify-between bg-white border border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-brand-black text-white text-[10px] font-bold flex items-center justify-center">%</span>
                          <span className="text-sm font-bold">{couponCode}</span>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-xs font-bold text-gray-500 hover:text-brand-accent transition-colors uppercase tracking-wider"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-0">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          placeholder="Promo code"
                          className="flex-1 border border-gray-300 border-r-0 px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          className="bg-brand-black text-white px-5 py-3 text-xs font-heading font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Grand total */}
                  <div className="mt-5 pt-5 border-t border-gray-200">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-heading font-bold uppercase tracking-wider">
                        Total
                      </span>
                      <span className="text-xl font-bold">{formatPrice(grandTotal)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Including all applicable taxes
                    </p>
                  </div>

                  {/* Checkout CTA */}
                  <Link
                    to="/checkout"
                    className="mt-6 w-full h-[52px] flex items-center justify-center bg-brand-black text-white font-heading font-bold uppercase text-sm tracking-wider hover:bg-gray-800 transition-colors"
                  >
                    Checkout
                  </Link>

                  {/* Trust signals */}
                  <div className="mt-6 pt-5 border-t border-gray-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <TruckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500">
                        Free shipping on orders over {formatPrice(FREE_SHIPPING_THRESHOLD)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ArrowPathIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500">
                        30-day free returns
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShieldCheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500">
                        Cash on Delivery available
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
