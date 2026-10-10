import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { orderApi, type OrderToConfirm } from '@/api/cart.api';
import Spinner from '@/components/ui/Spinner';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { formatPrice } from '@/utils/formatters';
import { trackEvent } from '@/utils/analytics';
import { whatsappLink } from '@/utils/whatsapp';

const detailOf = (error: unknown) =>
  (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
  'Something went wrong. Please try again or message us on WhatsApp.';

/** /order/confirm?token=… — the customer confirms their cash-on-delivery order (link sent on WhatsApp). */
export default function ConfirmOrderPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-to-confirm', token],
    queryFn: () => orderApi.getToConfirm(token).then((res) => res.data),
    enabled: !!token,
    retry: false,
  });

  const confirm = useMutation({
    mutationFn: () => orderApi.confirm(token).then((res) => res.data),
    onSuccess: (confirmed) => trackEvent('confirm_order', { transaction_id: confirmed.order_number }),
  });

  const current: OrderToConfirm | undefined = confirm.data ?? order;
  const isConfirmed = !!current && current.status !== 'pending';
  const help = whatsappLink(
    current ? `Hi! About my order ${current.order_number}: ` : 'Hi! About my order: ',
  );

  return (
    <>
      <Helmet>
        <title>Confirm Your Order</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="container-custom py-12 max-w-xl">
        {!token || error ? (
          <div className="text-center">
            <h1 className="type-section mb-4">Confirm Your Order</h1>
            <p className="text-sm text-gray-600 mb-6">{token ? detailOf(error) : 'This link is missing its code.'}</p>
            <a href={help} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
              <WhatsAppIcon className="w-5 h-5" /> Message us on WhatsApp
            </a>
          </div>
        ) : isLoading || !current ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <>
            {isConfirmed ? (
              <div className="text-center mb-8" role="status">
                <CheckCircleIcon className="w-14 h-14 text-success mx-auto mb-3" aria-hidden="true" />
                <h1 className="type-section mb-2">Order confirmed</h1>
                <p className="text-sm text-gray-600">
                  Thank you{current.first_name ? `, ${current.first_name}` : ''}! We'll pack order {current.order_number} and send it to{' '}
                  {current.city || 'you'}. Please keep {formatPrice(current.total)} ready in cash for the rider.
                </p>
              </div>
            ) : (
              <div className="text-center mb-8">
                <h1 className="type-section mb-2">Confirm your order</h1>
                <p className="text-sm text-gray-600">
                  Hi{current.first_name ? ` ${current.first_name}` : ''}! Please check your order {current.order_number} and
                  confirm it so we can send it out.
                </p>
              </div>
            )}

            <div className="border border-gray-200 p-5 mb-6">
              <ul className="divide-y divide-gray-200">
                {current.items.map((item, idx) => (
                  <li key={idx} className="py-3 flex justify-between gap-4 text-sm">
                    <span>
                      <span className="font-bold">{item.name}</span>
                      {item.variant_info && <span className="block text-gray-600">{item.variant_info}</span>}
                      <span className="block text-gray-600">Qty {item.quantity}</span>
                    </span>
                    <span className="font-bold whitespace-nowrap">{formatPrice(item.total_price)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-200 pt-3 mt-1 space-y-1 text-sm">
                {current.discount_amount > 0 && (
                  <p className="flex justify-between text-green-700">
                    <span>Discount</span><span>-{formatPrice(current.discount_amount)}</span>
                  </p>
                )}
                <p className="flex justify-between">
                  <span>Delivery</span><span>{current.shipping_cost === 0 ? 'FREE' : formatPrice(current.shipping_cost)}</span>
                </p>
                <p className="flex justify-between font-bold text-base">
                  <span>Total (cash on delivery)</span><span>{formatPrice(current.total)}</span>
                </p>
                {current.city && <p className="text-gray-600">Delivering to {current.city}</p>}
              </div>
            </div>

            {confirm.isError && <p className="text-sm text-error mb-4" role="alert">{detailOf(confirm.error)}</p>}

            {!isConfirmed && (
              <button
                type="button"
                onClick={() => confirm.mutate()}
                disabled={confirm.isPending}
                className="btn-primary w-full mb-3 disabled:opacity-60"
              >
                {confirm.isPending ? 'Confirming…' : 'Confirm my order'}
              </button>
            )}
            <a
              href={help}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 h-12 border border-[#1DA851] text-[#128C3E] text-sm font-bold uppercase tracking-wider hover:bg-[#1DA851]/10 transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
              {isConfirmed ? 'Questions? WhatsApp us' : 'Need a change? WhatsApp us'}
            </a>
            <p className="text-center mt-6">
              <Link to="/" className="text-sm underline">Continue shopping</Link>
            </p>
          </>
        )}
      </div>
    </>
  );
}
