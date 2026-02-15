import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { orderApi } from '@/api/cart.api';
import { formatPrice, formatDate } from '@/utils/formatters';
import { APP_NAME } from '@/utils/constants';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import type { Order } from '@/types/order';

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => orderApi.get(orderNumber!),
    enabled: !!orderNumber,
  });

  const order: Order | undefined = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-custom py-16 text-center">
        <h1 className="text-heading-xl font-heading uppercase">Order Not Found</h1>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Order Confirmed | {APP_NAME}</title>
      </Helmet>

      <div className="container-custom py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <CheckCircleIcon className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="text-heading-xl font-heading uppercase mb-2">Thank You!</h1>
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
