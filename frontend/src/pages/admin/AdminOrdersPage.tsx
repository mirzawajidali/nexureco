import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid';
import { CalendarDaysIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { adminOrdersApi } from '@/api/admin.api';
import { formatPrice } from '@/utils/formatters';
import { APP_NAME } from '@/utils/constants';
import Spinner from '@/components/ui/Spinner';

// --- Types ---

interface OrderListItem {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  item_count: number;
  customer_name: string | null;
  delivery_method: string;
  created_at: string;
}

interface OrderStats {
  today_orders: number;
  today_items: number;
  returns_total: number;
  fulfilled: number;
  delivered: number;
  total_orders: number;
}

// --- Constants ---

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unfulfilled', label: 'Unfulfilled' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'open', label: 'Open' },
  { key: 'archived', label: 'Archived' },
];

// --- Helpers ---

function formatOrderDate(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

  if (isToday) return `Today at ${timeStr}`;
  return `${months[d.getMonth()]} ${d.getDate()} at ${timeStr}`;
}

function paymentStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return { label: 'Paid', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
    case 'refunded':
      return { label: 'Refunded', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
    default:
      return { label: 'Payment pending', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' };
  }
}

function fulfillmentBadge(status: string) {
  switch (status) {
    case 'delivered':
      return { label: 'Fulfilled', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
    case 'shipped':
      return { label: 'In transit', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'cancelled':
      return { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
    case 'returned':
      return { label: 'Returned', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
    default:
      return { label: 'Unfulfilled', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' };
  }
}

function deliveryStatusText(status: string) {
  switch (status) {
    case 'shipped':
      return 'In transit';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return '';
  }
}

// --- Component ---

export default function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') || '1');
  const activeTab = searchParams.get('tab') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Build query params based on active tab
  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = { page, page_size: PAGE_SIZE };
    if (searchQuery) params.q = searchQuery;

    switch (activeTab) {
      case 'unfulfilled':
        params.fulfillment = 'unfulfilled';
        break;
      case 'unpaid':
        params.payment_status = 'pending';
        break;
      case 'open':
        // Open = not delivered/cancelled/returned
        params.fulfillment = 'unfulfilled';
        break;
      case 'archived':
        params.status = 'delivered';
        break;
    }
    return params;
  }, [page, activeTab, searchQuery]);

  // --- Queries ---

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', queryParams],
    queryFn: () => adminOrdersApi.list(queryParams),
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin', 'orders', 'stats'],
    queryFn: () => adminOrdersApi.stats(),
  });

  const orders: OrderListItem[] = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.total_pages ?? 1;
  const stats: OrderStats | null = statsData?.data ?? null;

  // --- Pagination ---

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  function setPage(newPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  }

  function setTab(tab: string) {
    const params = new URLSearchParams();
    if (tab !== 'all') params.set('tab', tab);
    if (searchQuery) params.set('q', searchQuery);
    setSearchParams(params);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('q', searchInput.trim());
    } else {
      params.delete('q');
    }
    params.delete('page');
    setSearchParams(params);
  }

  function clearSearch() {
    setSearchInput('');
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    params.delete('page');
    setSearchParams(params);
  }

  // --- Export ---

  async function handleExport() {
    try {
      const res = await adminOrdersApi.exportCsv(
        activeTab !== 'all' ? queryParams : undefined,
      );
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orders.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Orders exported');
    } catch {
      toast.error('Export failed');
    }
  }

  return (
    <>
      <Helmet>
        <title>Orders | {APP_NAME} Admin</title>
      </Helmet>

      <div className="space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5 text-gray-500" />
              Orders
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">View and manage customer orders</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Export
            </button>
            <Link
              to="/admin/orders/new"
              className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Create order
            </Link>
          </div>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="flex overflow-x-auto">
              {/* Today chip */}
              <div className="flex items-center px-5 py-4 border-r border-gray-200 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600 font-medium">
                  <CalendarDaysIcon className="h-3.5 w-3.5" />
                  Today
                </span>
              </div>

              {/* Orders */}
              <div className="px-5 py-4 border-r border-gray-200 shrink-0 min-w-[140px]">
                <p className="text-xs font-medium text-gray-500 mb-1">Orders</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-gray-900">{stats.today_orders}</span>
                  <span className="text-sm text-gray-400">&mdash;</span>
                </div>
              </div>

              {/* Items ordered */}
              <div className="px-5 py-4 border-r border-gray-200 shrink-0 min-w-[140px]">
                <p className="text-xs font-medium text-gray-500 mb-1">Items ordered</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-gray-900">{stats.today_items}</span>
                  <span className="text-sm text-gray-400">&mdash;</span>
                </div>
              </div>

              {/* Returns */}
              <div className="px-5 py-4 border-r border-gray-200 shrink-0 min-w-[150px]">
                <p className="text-xs font-medium text-gray-500 mb-1">Returns</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {stats.returns_total > 0 ? formatPrice(stats.returns_total) : `PKR 0`}
                  </span>
                  <span className="text-sm text-gray-400">&mdash;</span>
                </div>
              </div>

              {/* Orders fulfilled */}
              <div className="px-5 py-4 border-r border-gray-200 shrink-0 min-w-[150px]">
                <p className="text-xs font-medium text-gray-500 mb-1">Orders fulfilled</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-gray-900">{stats.fulfilled}</span>
                  <span className="text-sm text-gray-400">&mdash;</span>
                </div>
              </div>

              {/* Orders delivered */}
              <div className="px-5 py-4 shrink-0 min-w-[150px]">
                <p className="text-xs font-medium text-gray-500 mb-1">Orders delivered</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-gray-900">{stats.delivered}</span>
                  <span className="text-sm text-gray-400">&mdash;</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Tab row */}
          <div className="border-b border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex items-center gap-0">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setTab(tab.key)}
                    className={clsx(
                      'px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                      activeTab === tab.key
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search row */}
          <div className="px-4 py-3 border-b border-gray-200">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-gray-500">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-10">
                      <input type="checkbox" className="h-3.5 w-3.5 border-gray-300 rounded text-gray-900 focus:ring-gray-500" disabled />
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Order</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Customer</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Total</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Payment status</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Fulfillment status</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Items</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Delivery status</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Delivery method</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const payment = paymentStatusBadge(order.payment_status);
                    const fulfillment = fulfillmentBadge(order.status);
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="h-3.5 w-3.5 border-gray-300 rounded text-gray-900 focus:ring-gray-500" />
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-gray-900 hover:underline"
                          >
                            #{order.order_number}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                          {formatOrderDate(order.created_at)}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {order.customer_name || '—'}
                        </td>
                        <td className="px-3 py-3 text-gray-900 font-medium whitespace-nowrap">
                          {formatPrice(order.total)}
                        </td>
                        <td className="px-3 py-3">
                          <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', payment.bg, payment.text)}>
                            <span className={clsx('h-1.5 w-1.5 rounded-full', payment.dot)} />
                            {payment.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', fulfillment.bg, fulfillment.text)}>
                            <span className={clsx('h-1.5 w-1.5 rounded-full', fulfillment.dot)} />
                            {fulfillment.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                          {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                        </td>
                        <td className="px-3 py-3 text-gray-500">
                          {deliveryStatusText(order.status)}
                        </td>
                        <td className="px-3 py-3 text-gray-500">
                          {order.delivery_method}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="p-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500">
                  {rangeStart}–{rangeEnd} of {total}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="p-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
