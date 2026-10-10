import { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { goToPayFast, orderApi } from '@/api/cart.api';
import { useAuthStore } from '@/store/authStore';
import { formatPrice, formatDate } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import type { Order } from '@/types/order';

/** Result of an online payment (?payment=paid|failed, set by the PayFast return URL), with a retry. */
function PaymentResult({ orderNumber, payment }: { orderNumber: string; payment: string | null }) {
  const [retrying, setRetrying] = useState(false);
  if (payment === 'paid') {
    return (
      <div className="max-w-3xl mx-auto mb-8 bg-green-50 border border-green-200 p-4 text-sm text-green-800" role="status">
        <strong>Payment received.</strong> Your order is confirmed and we'll send it out soon.
      </div>
    );
  }
  if (payment !== 'failed') return null;
  return (
    <div className="max-w-3xl mx-auto mb-8 bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
      <p className="mb-3">
        <strong>Your payment didn't go through.</strong> Your order {orderNumber} is saved: you can try paying again,
        or we'll contact you on WhatsApp to arrange cash on delivery instead.
      </p>
      <button
        type="button"
        disabled={retrying}
        onClick={() => {
          setRetrying(true);
          goToPayFast(orderNumber).catch(() => setRetrying(false));
        }}
        className="btn-primary disabled:opacity-60"
      >
        {retrying ? 'Opening payment page…' : 'Try paying again'}
      </button>
    </div>
  );
}

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const payment = searchParams.get('payment');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Checkout hands over the order it just placed, so guests (who can't fetch orders) still see it
  const placedOrder = (location.state as { order?: Order } | null)?.order;

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => orderApi.get(orderNumber!),
    enabled: !!orderNumber && isAuthenticated,
  });

  const order: Order | undefined = data?.data ?? placedOrder;

  // TikTok Pixel: Purchase event (fires once when order loads)
  useEffect(() => {
    if (order && (window as any).ttq) {
      const orderValue = order.items.reduce(
        (sum: number, item: { total_price: number }) => sum + item.total_price,
        0,
      );
      (window as any).ttq.track('Purchase', {
        content_id: order.order_number,
        content_name: `Order ${order.order_number}`,
        content_type: 'product',
        value: orderValue,
        currency: 'PKR',
        num_items: order.items.length,
      });
    }
  }, [order]);

  if (isLoading && isAuthenticated && !placedOrder) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-custom py-16">
        <Helmet>
          <title>Your Order</title>
        </Helmet>
        {payment && orderNumber ? (
          <PaymentResult orderNumber={orderNumber} payment={payment} />
        ) : (
          <div className="text-center">
            <h1 className="type-display mb-4">Thank you!</h1>
            <p className="text-gray-600">
              {orderNumber ? `Order ${orderNumber} has been placed. ` : ''}
              You can follow it on the <Link to="/track-order" className="underline">Track Order</Link> page.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Order Confirmed</title>
      </Helmet>

      <div className="container-custom py-12">
        {payment && <PaymentResult orderNumber={order.order_number} payment={payment} />}

        {/* Success Header */}
        <div className="text-center mb-12">
          <CheckCircleIcon className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="type-display mb-2">Thank You!</h1>
          <p className="text-gray-500">Your order has been placed successfully.</p>
          <p className="text-sm text-gray-400 mt-2">
            Order #{order.order_number} - {formatDate(order.created_at)}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Order Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Shipping */}
            <div className="border border-gray-200 p-6">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-3">
                Shipping Address
              </h3>
              <p className="text-sm">
                {order.shipping_first_name} {order.shipping_last_name}
              </p>
              <p className="text-sm text-gray-500">{order.shipping_address1}</p>
              {order.shipping_address2 && (
                <p className="text-sm text-gray-500">{order.shipping_address2}</p>
              )}
              <p className="text-sm text-gray-500">
                {order.shipping_city}, {order.shipping_state} {order.shipping_postal_code}
              </p>
              <p className="text-sm text-gray-500">{order.shipping_phone}</p>
            </div>

            {/* Payment */}
            <div className="border border-gray-200 p-6">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-3">
                Payment
              </h3>
              <p className="text-sm font-bold">Cash on Delivery</p>
              <p className="text-sm text-gray-500 mt-1">
                Status: <span className="capitalize">{order.payment_status}</span>
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Shipping</span>
                  <span>{order.shipping_cost === 0 ? 'FREE' : formatPrice(order.shipping_cost)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm mt-1 text-success">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold mt-3 pt-3 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="border border-gray-200 p-6 mb-8">
            <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-4">
              Items Ordered
            </h3>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="w-16 h-16 bg-gray-100 flex-shrink-0">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-sm uppercase">{item.product_name}</p>
                    {item.variant_info && (
                      <p className="text-xs text-gray-500">{item.variant_info}</p>
                    )}
                    {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatPrice(item.unit_price)} x {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0">
                    {formatPrice(item.total_price)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={`/track-order/${order.order_number}`}>
              <Button variant="primary" size="lg">
                Track Order
              </Button>
            </Link>
            <Link to="/">
              <Button variant="secondary" size="lg">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
