import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/api/cart.api';
import { formatPrice, formatDate } from '@/utils/formatters';
import Spinner from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import { clsx } from 'clsx';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  returned: 'bg-gray-100 text-gray-700',
};

export default function AccountOrders() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () => orderApi.list(page),
  });

  const orders = data?.data?.items || [];
  const totalPages = data?.data?.total_pages || 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-heading font-heading uppercase mb-6">Order History</h2>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50">
          <p className="text-sm text-gray-500 mb-4">No orders yet.</p>
          <Link
            to="/"
            className="text-xs font-heading font-bold uppercase tracking-wider text-brand-black hover:underline"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order: { id: number; order_number: string; status: string; total: number; item_count: number; created_at: string }) => (
              <Link
                key={order.id}
                to={`/track-order/${order.order_number}`}
                className="block border border-gray-200 p-5 hover:border-brand-black transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-heading font-bold text-sm uppercase">
                      #{order.order_number}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(order.created_at)} &middot; {order.item_count} item
                      {order.item_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={clsx(
                        'px-3 py-1 text-xs font-heading font-bold uppercase',
                        STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {order.status}
                    </span>
                    <span className="font-bold">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
