import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminDashboardApi, adminOrdersApi, adminAnalyticsApi } from '@/api/admin.api';
import { formatPrice, formatDate } from '@/utils/formatters';
import { APP_NAME, ORDER_STATUS_LABELS } from '@/utils/constants';
import Spinner from '@/components/ui/Spinner';

// --- Types ---

type Period = 'today' | '7d' | '30d' | '90d' | '12m';

interface AnalyticsData {
  metrics: {
    total_sales: number;
    total_sales_change: number;
    total_orders: number;
    total_orders_change: number;
    avg_order_value: number;
    avg_order_value_change: number;
    fulfilled_orders: number;
    fulfilled_orders_change: number;
  };
  sales_breakdown: {
    gross_sales: number;
    discounts: number;
    returns: number;
    net_sales: number;
    shipping: number;
    tax: number;
    total_sales: number;
  };
  sales_over_time: { date: string; sales: number; orders: number }[];
  top_products: { name: string; units_sold: number; revenue: number; image_url: string | null }[];
}

interface LowStockItem {
  id: number;
  product_name: string;
  variant_info: string | null;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
}

// --- Period Options ---

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
];

const STATUS_DOT_COLOR: Record<string, string> = {
  pending: 'bg-yellow-400',
  confirmed: 'bg-blue-400',
  processing: 'bg-blue-400',
  shipped: 'bg-cyan-400',
  delivered: 'bg-green-400',
  cancelled: 'bg-red-400',
  returned: 'bg-red-400',
};

// --- Helpers ---

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-gray-400 mt-1">No change</span>;
  const isPositive = value > 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 text-xs font-medium mt-1',
        isPositive ? 'text-green-600' : 'text-red-500',
      )}
    >
      {isPositive ? (
        <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
      ) : (
        <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
      )}
      {isPositive ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `Rs. ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `Rs. ${(value / 1_000).toFixed(1)}K`;
  return formatPrice(value);
}

function formatChartDate(dateStr: string, period: Period): string {
  if (period === 'today') return dateStr;
  if (period === '12m') return dateStr;
  // For day-based: show "Feb 5" format
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- Custom Tooltip ---

function ChartTooltip({ active, payload, label, period }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{formatChartDate(label, period)}</p>
      <p className="text-gray-900">
        <span className="font-semibold">{formatPrice(payload[0]?.value ?? 0)}</span> sales
      </p>
      {payload[1] && (
        <p className="text-gray-500">
          {payload[1]?.value ?? 0} orders
        </p>
      )}
    </div>
  );
}

// --- Main Page ---

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<Period>('30d');

  // Analytics data (chart + metrics)
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['admin', 'analytics', 'dashboard', period],
    queryFn: () => adminAnalyticsApi.dashboard(period).then((r) => r.data),
  });

  // Recent orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'recent-orders'],
    queryFn: () => adminOrdersApi.list({ page_size: 5 }).then((r) => r.data),
  });

  // Low stock
  const { data: lowStockData, isLoading: lowStockLoading } = useQuery<LowStockItem[]>({
    queryKey: ['admin', 'dashboard', 'low-stock'],
    queryFn: () => adminDashboardApi.getLowStock().then((r) => r.data),
  });

  const recentOrders = ordersData?.items ?? [];
  const lowStockItems = Array.isArray(lowStockData) ? lowStockData : [];
  const metrics = analytics?.metrics;
  const breakdown = analytics?.sales_breakdown;
  const chartData = analytics?.sales_over_time ?? [];
  const topProducts = analytics?.top_products ?? [];

  return (
    <>
      <Helmet>
        <title>Dashboard | {APP_NAME} Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header with period selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Squares2X2Icon className="h-5 w-5 text-gray-500" />
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your store</p>
          </div>
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  period === p.value
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        {analyticsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                <div className="h-7 w-28 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Sales"
              value={formatPrice(metrics.total_sales)}
              change={metrics.total_sales_change}
            />
            <MetricCard
              label="Orders"
              value={metrics.total_orders.toLocaleString()}
              change={metrics.total_orders_change}
            />
            <MetricCard
              label="Avg. Order Value"
              value={formatPrice(metrics.avg_order_value)}
              change={metrics.avg_order_value_change}
            />
            <MetricCard
              label="Fulfilled"
              value={metrics.fulfilled_orders.toLocaleString()}
              change={metrics.fulfilled_orders_change}
            />
          </div>
        ) : null}

        {/* Sales Chart + Sales Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales Over Time Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-semibold text-gray-900">Total sales</h2>
            </div>
            <div className="px-2 py-4" style={{ height: 320 }}>
              {analyticsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Spinner />
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-400">No sales data for this period</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatChartDate(v, period)}
                      interval="preserveStartEnd"
                      minTickGap={40}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
                      width={48}
                    />
                    <Tooltip content={<ChartTooltip period={period} />} />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#1a1a1a"
                      strokeWidth={2}
                      fill="url(#salesGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#1a1a1a', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Sales Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-semibold text-gray-900">Sales breakdown</h2>
            </div>
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : breakdown ? (
              <div className="p-5 space-y-0">
                <BreakdownRow label="Gross sales" value={breakdown.gross_sales} />
                <BreakdownRow label="Discounts" value={-breakdown.discounts} isNegative />
                <BreakdownRow label="Returns" value={-breakdown.returns} isNegative />
                <div className="border-t border-gray-100 my-2" />
                <BreakdownRow label="Net sales" value={breakdown.net_sales} bold />
                <BreakdownRow label="Shipping" value={breakdown.shipping} />
                <BreakdownRow label="Tax" value={breakdown.tax} />
                <div className="border-t border-gray-200 my-2" />
                <BreakdownRow label="Total sales" value={breakdown.total_sales} bold large />
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-gray-400">No data</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products + Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Products */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-semibold text-gray-900">Top products</h2>
              <Link
                to="/admin/products"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                View all
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : topProducts.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-gray-400">No product data for this period</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {topProducts.map((product) => (
                  <div key={product.name} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="flex-shrink-0 w-9 h-9 rounded-lg object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.units_sold} sold</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 flex-shrink-0 ml-4">
                      {formatPrice(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-semibold text-gray-900">Recent orders</h2>
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                View all
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-gray-400">No orders yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentOrders.map((order: Record<string, unknown>) => (
                  <Link
                    key={order.id as number}
                    to={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={clsx(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          STATUS_DOT_COLOR[order.status as string] ?? 'bg-gray-300',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          #{order.order_number as string}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ORDER_STATUS_LABELS[order.status as string] ?? (order.status as string)}
                          {order.customer_name ? ` · ${order.customer_name as string}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {formatPrice(order.total as number)}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(order.created_at as string)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-gray-900">Low stock alerts</h2>
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-100 text-red-600 text-[11px] font-semibold">
                  {lowStockItems.length}
                </span>
              </div>
              <Link
                to="/admin/inventory"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Manage inventory
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {lowStockItems.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-400">{item.sku || item.variant_info || 'No SKU'}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {item.stock_quantity <= 0 && (
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={clsx(
                        'text-sm font-semibold tabular-nums',
                        item.stock_quantity <= 0 ? 'text-red-600' : 'text-yellow-600',
                      )}
                    >
                      {item.stock_quantity}
                    </span>
                    <span className="text-xs text-gray-400">/ {item.low_stock_threshold}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// --- Sub-components ---

function MetricCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="text-[13px] text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
      <ChangeIndicator value={change} />
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  bold,
  large,
  isNegative,
}: {
  label: string;
  value: number;
  bold?: boolean;
  large?: boolean;
  isNegative?: boolean;
}) {
  const display = isNegative && value !== 0 ? `-${formatPrice(Math.abs(value))}` : formatPrice(Math.abs(value));
  return (
    <div className="flex items-center justify-between py-2">
      <span
        className={clsx(
          large ? 'text-sm' : 'text-[13px]',
          bold ? 'font-semibold text-gray-900' : 'text-gray-600',
        )}
      >
        {label}
      </span>
      <span
        className={clsx(
          'tabular-nums',
          large ? 'text-sm' : 'text-[13px]',
          bold ? 'font-semibold text-gray-900' : 'text-gray-700',
          isNegative && value !== 0 && 'text-red-600',
        )}
      >
        {display}
      </span>
    </div>
  );
}
