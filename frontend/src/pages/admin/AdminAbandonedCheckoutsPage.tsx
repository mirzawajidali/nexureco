import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { adminAbandonedCheckoutsApi, type AbandonedCheckout } from '@/api/admin.api';
import Spinner from '@/components/ui/Spinner';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { formatPrice } from '@/utils/formatters';
import { whatsappLink } from '@/utils/whatsapp';

const TABS: { status: string; label: string; hint: string }[] = [
  { status: 'open', label: 'To remind', hint: 'Left checkout over 30 minutes ago without ordering' },
  { status: 'reminded', label: 'Reminded', hint: 'Sent a WhatsApp reminder, no order yet' },
  { status: 'converted', label: 'Ordered', hint: 'Placed an order after all (same checkout or phone number)' },
  { status: 'all', label: 'All', hint: 'Every saved checkout, including ones still in progress' },
];

/** Unfinished checkouts with a one-click WhatsApp reminder (the link restores the customer's bag). */
export default function AdminAbandonedCheckoutsPage() {
  const [status, setStatus] = useState('open');
  const [preview, setPreview] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'abandoned-checkouts', status],
    queryFn: () => adminAbandonedCheckoutsApi.list(status).then((res) => res.data.items),
  });

  const reminded = useMutation({
    mutationFn: (id: number) => adminAbandonedCheckoutsApi.markReminded(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'abandoned-checkouts'] }),
  });

  const items: AbandonedCheckout[] = data ?? [];
  const totalValue = items.reduce((sum, c) => sum + c.subtotal, 0);

  return (
    <>
      <Helmet>
        <title>Abandoned checkouts | Admin</title>
      </Helmet>

      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Abandoned checkouts</h1>
          <p className="text-sm text-gray-500">
            Customers who entered their details at checkout but didn't place the order. Send a WhatsApp reminder;
            its link puts their items back in the bag.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter checkouts">
          {TABS.map((tab) => (
            <button
              key={tab.status}
              role="tab"
              aria-selected={status === tab.status}
              title={tab.hint}
              onClick={() => setStatus(tab.status)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                status === tab.status ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
            Nothing here right now.
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              {items.length} checkout{items.length !== 1 ? 's' : ''} · {formatPrice(totalValue)} in bags
            </p>
            <div className="space-y-3">
              {items.map((c) => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {c.first_name || 'Customer'}
                        <span className="font-normal text-gray-500"> · {c.phone}{c.city ? ` · ${c.city}` : ''}</span>
                      </p>
                      <ul className="mt-1 text-sm text-gray-700">
                        {c.items.map((item, idx) => (
                          <li key={idx}>
                            {item.name}
                            {item.variant_info ? ` (${item.variant_info})` : ''} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatPrice(c.subtotal)} · last active {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                        {c.reminded_at && ` · reminded ${formatDistanceToNow(new Date(c.reminded_at), { addSuffix: true })}`}
                      </p>
                    </div>

                    <div className="flex flex-col items-stretch gap-1 md:w-56">
                      {c.status === 'converted' ? (
                        <span className="text-center text-xs font-medium text-green-700 bg-green-50 rounded-lg px-3 py-2">Ordered</span>
                      ) : c.whatsapp ? (
                        <a
                          href={whatsappLink(c.message, c.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => reminded.mutate(c.id)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-[#1DA851] hover:bg-[#178a43] transition-colors"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                          {c.status === 'reminded' ? 'Remind again' : 'Send reminder'}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">Not a mobile number</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreview(preview === c.id ? null : c.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {preview === c.id ? 'Hide message' : 'Preview message'}
                      </button>
                    </div>
                  </div>
                  {preview === c.id && (
                    <p className="mt-3 text-xs text-gray-700 whitespace-pre-line bg-gray-50 border border-gray-200 rounded-lg p-3">
                      {c.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
