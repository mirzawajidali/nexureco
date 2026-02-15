import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Helmet } from 'react-helmet-async';
import {
  CheckCircleIcon,
  TruckIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/solid';
import {
  XCircleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { orderApi } from '@/api/cart.api';
import { formatPrice, formatDate, formatDateTime } from '@/utils/formatters';
import { APP_NAME } from '@/utils/constants';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Spinner from '@/components/ui/Spinner';
import { clsx } from 'clsx';
import type { Order, OrderStatus } from '@/types/order';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

/* ── Status timeline config ── */
const STATUS_STEPS: { key: OrderStatus; label: string; icon: React.ElementType }[] = [
  { key: 'pending', label: 'Order Placed', icon: CubeIcon },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircleIcon },
  { key: 'shipped', label: 'Shipped', icon: TruckIcon },
  { key: 'delivered', label: 'Delivered', icon: CheckCircleIcon },
];

function getStatusIndex(status: OrderStatus): number {
  if (status === 'processing') return 1;
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

/* ── Lookup Form ── */
interface TrackFormData {
  order_number: string;
  email: string;
}

function TrackingLookupForm({
  onResult,
  defaultOrderNumber,
}: {
  onResult: (order: Order) => void;
  defaultOrderNumber?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackFormData>({
    defaultValues: { order_number: defaultOrderNumber || '' },
  });

  const mutation = useMutation({
    mutationFn: (data: TrackFormData) => orderApi.track(data.order_number, data.email),
    onSuccess: (res) => onResult(res.data),
    onError: () => toast.error('No order found. Please check your order number and email.'),
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
      <div>
        <label className="text-xs font-heading font-bold uppercase tracking-wider text-gray-500 mb-2 block">
          Order Number
        </label>
        <input
          {...register('order_number', { required: 'Order number is required' })}
          placeholder="e.g. MB-12345678"
          className="w-full border border-gray-300 px-4 py-3.5 text-sm focus:outline-none focus:border-brand-black transition-colors"
        />
        {errors.order_number && (
          <p className="text-xs text-error mt-1">{errors.order_number.message}</p>
        )}
      </div>
      <div>
        <label className="text-xs font-heading font-bold uppercase tracking-wider text-gray-500 mb-2 block">
          Email Address
        </label>
        <input
          type="email"
          {...register('email', { required: 'Email is required' })}
          placeholder="Email used when placing the order"
          className="w-full border border-gray-300 px-4 py-3.5 text-sm focus:outline-none focus:border-brand-black transition-colors"
        />
        {errors.email && (
          <p className="text-xs text-error mt-1">{errors.email.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full h-[52px] flex items-center justify-center gap-2 bg-brand-black text-white font-heading font-bold uppercase text-sm tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? (
          <Spinner size="sm" />
        ) : (
          <>
            <MagnifyingGlassIcon className="w-4 h-4" />
            Track Order
          </>
        )}
      </button>
    </form>
  );
}

/* ── Tracking Result Display ── */
function TrackingResult({
  order,
  onReset,
}: {
  order: Order;
  onReset: () => void;
}) {
  const isCancelled = order.status === 'cancelled';
  const isReturned = order.status === 'returned';
  const activeIndex = getStatusIndex(order.status as OrderStatus);
  const { user } = useAuthStore();
  const [cancelling, setCancelling] = useState(false);
  const canCancel = ['pending', 'confirmed'].includes(order.status);

  const handleCancel = async () => {
    if (!user || !confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      await orderApi.cancel(order.order_number);
      toast.success('Order cancelled successfully');
      onReset();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Order Header Card */}
      <div className="bg-gray-50 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-heading font-bold uppercase tracking-[0.2em] text-gray-400 mb-1">
              Order Number
            </p>
            <h2 className="text-heading font-heading uppercase">
              {order.order_number}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Placed on {formatDate(order.created_at)}
            </p>
          </div>
          <span
            className={clsx(
              'px-4 py-1.5 text-xs font-heading font-bold uppercase tracking-wider',
              order.status === 'delivered' && 'bg-green-100 text-green-700',
              order.status === 'cancelled' && 'bg-red-100 text-red-600',
              order.status === 'shipped' && 'bg-blue-100 text-blue-700',
              order.status === 'returned' && 'bg-orange-100 text-orange-700',
              !['delivered', 'cancelled', 'shipped', 'returned'].includes(order.status) &&
                'bg-gray-200 text-gray-700'
            )}
          >
            {order.status}
          </span>
        </div>
      </div>

      {/* Status Timeline */}
      {!isCancelled && !isReturned ? (
        <div className="px-2 py-4">
          {/* Desktop timeline */}
          <div className="hidden sm:flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-brand-black transition-all duration-700 ease-out"
              style={{
                width: `${(activeIndex / (STATUS_STEPS.length - 1)) * 100}%`,
              }}
            />
            {STATUS_STEPS.map((step, i) => {
              const isCompleted = i <= activeIndex;
              const isCurrent = i === activeIndex;
              const Icon = step.icon;
              return (
                <div key={step.key} className="relative flex flex-col items-center z-10">
                  <div
                    className={clsx(
                      'w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300',
                      isCompleted ? 'bg-brand-black text-white' : 'bg-gray-200 text-gray-400',
                      isCurrent && 'ring-4 ring-brand-black/20'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={clsx(
                      'text-xs font-heading font-bold uppercase mt-3 tracking-wider',
                      isCompleted ? 'text-brand-black' : 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mobile timeline (vertical) */}
          <div className="sm:hidden space-y-0">
            {STATUS_STEPS.map((step, i) => {
              const isCompleted = i <= activeIndex;
              const isCurrent = i === activeIndex;
              const Icon = step.icon;
              const isLast = i === STATUS_STEPS.length - 1;
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={clsx(
                        'w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0',
                        isCompleted ? 'bg-brand-black text-white' : 'bg-gray-200 text-gray-400',
                        isCurrent && 'ring-4 ring-brand-black/20'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {!isLast && (
                      <div
                        className={clsx(
                          'w-0.5 h-8',
                          i < activeIndex ? 'bg-brand-black' : 'bg-gray-200'
                        )}
                      />
                    )}
                  </div>
                  <div className="pb-6">
                    <p
                      className={clsx(
                        'text-sm font-heading font-bold uppercase tracking-wider pt-1',
                        isCompleted ? 'text-brand-black' : 'text-gray-400'
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-100">
          <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm text-red-600 capitalize">{order.status}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              This order has been {order.status}.
            </p>
          </div>
        </div>
      )}

      {/* Tracking Info */}
      {order.tracking_number && (
        <div className="border border-gray-200 p-6">
          <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-4">
            Tracking Information
          </h3>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500">Tracking Number</p>
              <p className="text-sm font-bold mt-0.5">{order.tracking_number}</p>
            </div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-black text-white px-5 py-2.5 text-xs font-heading font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
              >
                Track Package
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Status History */}
      {order.status_history.length > 0 && (
        <div className="border border-gray-200 p-6">
          <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-5">
            Status History
          </h3>
          <div className="space-y-0">
            {[...order.status_history].reverse().map((history, idx) => (
              <div key={history.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={clsx(
                      'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                      idx === 0 ? 'bg-brand-black' : 'bg-gray-300'
                    )}
                  />
                  {idx < order.status_history.length - 1 && (
                    <div className="w-px h-full bg-gray-200 min-h-[24px]" />
                  )}
                </div>
                <div className="pb-5">
                  <p className={clsx(
                    'text-sm font-bold capitalize',
                    idx === 0 ? 'text-brand-black' : 'text-gray-600'
                  )}>
                    {history.status}
                  </p>
                  {history.note && (
                    <p className="text-xs text-gray-500 mt-0.5">{history.note}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(history.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="border border-gray-200 p-6">
        <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-5">
          Items Ordered
        </h3>
        <div className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <div className="w-[60px] h-[78px] bg-gray-100 flex-shrink-0 overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ShoppingBagIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{item.product_name}</p>
                {item.variant_info && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.variant_info}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatPrice(item.unit_price)} x {item.quantity}
                </p>
              </div>
              <p className="text-sm font-bold flex-shrink-0">
                {formatPrice(item.total_price)}
              </p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 mt-5 pt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Shipping</span>
            <span className={order.shipping_cost === 0 ? 'text-green-600 font-bold' : ''}>
              {order.shipping_cost === 0 ? 'FREE' : formatPrice(order.shipping_cost)}
            </span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-3 border-t border-gray-200">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {canCancel && user && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 sm:flex-none h-[48px] px-8 flex items-center justify-center border border-red-300 text-red-600 font-heading font-bold uppercase text-xs tracking-wider hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Order'}
          </button>
        )}
        <button
          onClick={onReset}
          className="flex-1 sm:flex-none h-[48px] px-8 flex items-center justify-center border border-gray-300 text-gray-700 font-heading font-bold uppercase text-xs tracking-wider hover:bg-gray-50 transition-colors"
        >
          Track Another Order
        </button>
        <Link
          to="/"
          className="flex-1 sm:flex-none h-[48px] px-8 flex items-center justify-center bg-brand-black text-white font-heading font-bold uppercase text-xs tracking-wider hover:bg-gray-800 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function OrderTrackingPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { user } = useAuthStore();
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);

  // If logged-in user visits /track-order/:orderNumber directly, auto-fetch
  const { isLoading } = useQuery({
    queryKey: ['order-track-direct', orderNumber],
    queryFn: () => orderApi.get(orderNumber!).then((res) => {
      setTrackedOrder(res.data);
      return res;
    }),
    enabled: !!orderNumber && !!user && !trackedOrder,
  });

  const showLookup = !trackedOrder && !isLoading;

  return (
    <>
      <Helmet>
        <title>Track Your Order | {APP_NAME}</title>
      </Helmet>

      {/* Hero */}
      <section className="bg-brand-black text-white">
        <div className="container-custom pt-8 pb-14 md:pb-20">
          <Breadcrumb
            items={[{ label: 'Track Order' }]}
            className="[&_a]:text-gray-500 [&_span]:text-gray-400 [&_svg]:text-gray-600 mb-8"
          />
          <h1
            className="font-heading font-black uppercase text-white leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)' }}
          >
            Track Your<br />Order
          </h1>
        </div>
      </section>

      <section className="container-custom section-padding">
        <div className="max-w-3xl mx-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          )}

          {showLookup && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
              {/* Left — Form */}
              <div className="lg:col-span-3">
                <div className="border border-gray-200 p-6 md:p-10">
                  <h2 className="text-sm font-heading font-bold uppercase tracking-wider mb-6">
                    Enter Your Order Details
                  </h2>
                  <TrackingLookupForm
                    onResult={setTrackedOrder}
                    defaultOrderNumber={orderNumber}
                  />
                </div>
              </div>

              {/* Right — Help info */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-3">
                    Where's my order number?
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Your order number was included in your order confirmation email.
                    It starts with <span className="font-bold text-brand-black">MB-</span> followed by 8 digits.
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <TruckIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-brand-black">Standard Delivery</p>
                      <p className="text-xs text-gray-500">3-5 business days</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ArrowPathIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-brand-black">Free Returns</p>
                      <p className="text-xs text-gray-500">Within 30 days of delivery</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheckIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-brand-black">Cash on Delivery</p>
                      <p className="text-xs text-gray-500">Pay when you receive</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <p className="text-xs text-gray-500">
                    Need help?{' '}
                    <Link to="/contact" className="font-bold text-brand-black hover:underline">
                      Contact our support team
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}

          {trackedOrder && (
            <TrackingResult
              order={trackedOrder}
              onReset={() => setTrackedOrder(null)}
            />
          )}
        </div>
      </section>
    </>
  );
}
