import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  UsersIcon,
  CalendarDaysIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import {
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import { adminAnalyticsApi } from '@/api/admin.api';
import { formatPrice } from '@/utils/formatters';
import { APP_NAME } from '@/utils/constants';
import Spinner from '@/components/ui/Spinner';
// Lazy-load heavy PDF library (jsPDF + autoTable) — only downloaded when user clicks "Download"
const loadReportPdf = () => import('@/utils/reportPdf');

// --- Types ---

type Period = 'today' | '7d' | '30d' | '90d' | '12m';
type ReportType = 'sales' | 'products' | 'financial' | 'customers';

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
  top_products: { name: string; units_sold: number; revenue: number }[];
}

interface SalesData {
  total_revenue: number;
  today_revenue: number;
  month_revenue: number;
  orders_by_month: { year: number; month: number; order_count: number; revenue: number }[];
}

interface CustomerData {
  total_customers: number;
  new_this_month: number;
  new_today: number;
}

// --- Constants ---

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '12m', label: '12 months' },
];

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const REPORT_TYPES: { type: ReportType; title: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'sales', title: 'Sales Report', description: 'Daily sales breakdown with totals and averages', icon: DocumentTextIcon },
  { type: 'products', title: 'Product Performance', description: 'Top products ranked by revenue and units sold', icon: ShoppingBagIcon },
  { type: 'financial', title: 'Financial Summary', description: 'Complete financial breakdown with revenue overview', icon: BanknotesIcon },
  { type: 'customers', title: 'Customer Report', description: 'Customer growth statistics and monthly trends', icon: UserGroupIcon },
];

// --- Helpers ---

function ChangeIndicator({ value, className }: { value: number; className?: string }) {
  if (value === 0) return <span className={clsx('text-xs text-gray-400', className)}>No change</span>;
  const isPositive = value > 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isPositive ? 'text-green-600' : 'text-red-500',
        className,
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

function formatChartDate(dateStr: string, period: Period): string {
  if (period === 'today') return dateStr;
  if (period === '12m') return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPeriodLabel(period: Period): string {
  const today = new Date();
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  switch (period) {
    case 'today':
      return `Today · ${fmtDate(today)}`;
    case '7d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return `Last 7 days · ${fmtDate(start)} – ${fmtDate(today)}`;
    }
    case '30d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return `Last 30 days · ${fmtDate(start)} – ${fmtDate(today)}`;
    }
    case '90d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 89);
      return `Last 90 days · ${fmtDate(start)} – ${fmtDate(today)}`;
    }
    case '12m': {
      const start = new Date(today);
      start.setFullYear(start.getFullYear() - 1);
      return `Last 12 months · ${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
  }
}

// --- Custom Tooltips ---

function SalesChartTooltip({ active, payload, label, period }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3.5 py-2.5 text-xs">
      <p className="font-medium text-gray-700 mb-1.5">{formatChartDate(label, period)}</p>
      <div className="space-y-1">
        <p className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-900" />
          <span className="text-gray-500">Sales:</span>
          <span className="font-semibold text-gray-900">{formatPrice(payload[0]?.value ?? 0)}</span>
        </p>
        {payload[1] && (
          <p className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-gray-500">Orders:</span>
            <span className="font-semibold text-gray-900">{payload[1]?.value ?? 0}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function RevenueChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3.5 py-2.5 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="flex items-center gap-2">
        <span className="text-gray-500">Revenue:</span>
        <span className="font-semibold text-gray-900">{formatPrice(payload[0]?.value ?? 0)}</span>
      </p>
      {payload[1] && (
        <p className="flex items-center gap-2">
          <span className="text-gray-500">Orders:</span>
          <span className="font-semibold text-gray-900">{payload[1]?.value ?? 0}</span>
        </p>
      )}
    </div>
  );
}

// --- Skeleton Loaders ---

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
          <div className="h-7 w-28 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-16 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <Spinner />
    </div>
  );
}

// --- Main Page ---

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['admin', 'analytics', 'dashboard', period],
    queryFn: () => adminAnalyticsApi.dashboard(period).then((r) => r.data),
  });

  const { data: salesData, isLoading: salesLoading } = useQuery<SalesData>({
    queryKey: ['admin', 'analytics', 'sales'],
    queryFn: () => adminAnalyticsApi.sales().then((r) => r.data),
  });

  const { data: customerData, isLoading: customersLoading } = useQuery<CustomerData>({
    queryKey: ['admin', 'analytics', 'customers'],
    queryFn: () => adminAnalyticsApi.customers().then((r) => r.data),
  });

  const metrics = analytics?.metrics;
  const breakdown = analytics?.sales_breakdown;
  const chartData = analytics?.sales_over_time ?? [];
  const topProducts = analytics?.top_products ?? [];
  const maxRevenue = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.revenue)) : 1;

  const monthlyData = (salesData?.orders_by_month ?? []).map((m) => ({
    label: `${MONTH_NAMES[m.month]} ${String(m.year).slice(-2)}`,
    revenue: m.revenue,
    orders: m.order_count,
  }));

  const periodLabel = getPeriodLabel(period);
  const dataReady = !analyticsLoading && !!analytics;

  async function handleDownloadPdf(type: ReportType) {
    if (!analytics) return;
    const { generateSalesReport, generateProductReport, generateFinancialReport, generateCustomerReport } = await loadReportPdf();
    switch (type) {
      case 'sales':
        await generateSalesReport(analytics.sales_over_time, analytics.metrics, analytics.sales_breakdown.net_sales, periodLabel);
        break;
      case 'products':
        await generateProductReport(analytics.top_products, periodLabel);
        break;
      case 'financial':
        if (salesData) {
          await generateFinancialReport(
            analytics.sales_breakdown,
            { total_revenue: salesData.total_revenue, month_revenue: salesData.month_revenue, today_revenue: salesData.today_revenue },
            periodLabel,
          );
        }
        break;
      case 'customers':
        if (customerData) {
          await generateCustomerReport(customerData, monthlyData);
        }
        break;
    }
  }

  return (
    <>
      <Helmet>
        <title>Analytics | {APP_NAME} Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-gray-500" />
              Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Detailed insights into your store performance</p>
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
          <MetricsSkeleton />
        ) : metrics ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Sales" value={formatPrice(metrics.total_sales)} change={metrics.total_sales_change} />
            <MetricCard label="Orders" value={metrics.total_orders.toLocaleString()} change={metrics.total_orders_change} />
            <MetricCard label="Avg. Order Value" value={formatPrice(metrics.avg_order_value)} change={metrics.avg_order_value_change} />
            <MetricCard label="Fulfilled" value={metrics.fulfilled_orders.toLocaleString()} change={metrics.fulfilled_orders_change} />
          </div>
        ) : null}

        {/* Sales & Orders Over Time + Sales Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">Sales & orders over time</h2>
              <div className="flex items-center gap-4 text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[2px] bg-gray-900 rounded" /> Sales
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[2px] bg-blue-500 rounded" /> Orders
                </span>
              </div>
            </div>
            <div className="px-2 py-4" style={{ height: 340 }}>
              {analyticsLoading ? (
                <ChartSkeleton height={300} />
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-400">No data for this period</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a1a1a" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#1a1a1a" stopOpacity={0} />
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
                      yAxisId="sales"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
                      width={48}
                    />
                    <YAxis
                      yAxisId="orders"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#93c5fd' }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip content={<SalesChartTooltip period={period} />} />
                    <Area
                      yAxisId="sales"
                      type="monotone"
                      dataKey="sales"
                      stroke="#1a1a1a"
                      strokeWidth={2}
                      fill="url(#salesAreaGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#1a1a1a', strokeWidth: 0 }}
                    />
                    <Line
                      yAxisId="orders"
                      type="monotone"
                      dataKey="orders"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      activeDot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-semibold text-gray-900">Sales breakdown</h2>
            </div>
            {analyticsLoading ? (
              <ChartSkeleton height={280} />
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

        {/* Revenue Summary + Monthly Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-semibold text-gray-900">Revenue summary</h2>
            </div>
            {salesLoading ? (
              <ChartSkeleton height={200} />
            ) : salesData ? (
              <div className="p-5 space-y-4">
                <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-green-600" />} label="All-time revenue" value={formatPrice(salesData.total_revenue)} bgColor="bg-green-50" />
                <SummaryCard icon={<CalendarDaysIcon className="h-5 w-5 text-blue-600" />} label="This month" value={formatPrice(salesData.month_revenue)} bgColor="bg-blue-50" />
                <SummaryCard icon={<CurrencyDollarIcon className="h-5 w-5 text-purple-600" />} label="Today" value={formatPrice(salesData.today_revenue)} bgColor="bg-purple-50" />
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-[15px] font-semibold text-gray-900">Monthly revenue trend</h2>
            </div>
            <div className="px-2 py-4" style={{ height: 280 }}>
              {salesLoading ? (
                <ChartSkeleton height={240} />
              ) : monthlyData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-400">No monthly data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)} width={48} />
                    <Tooltip content={<RevenueChartTooltip />} />
                    <Bar dataKey="revenue" fill="#1a1a1a" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Customer Analytics */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-semibold text-gray-900">Customer analytics</h2>
          </div>
          {customersLoading ? (
            <div className="p-5"><MetricsSkeleton /></div>
          ) : customerData ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              <CustomerStat label="Total customers" value={customerData.total_customers.toLocaleString()} description="All registered customers" icon={<UsersIcon className="h-5 w-5 text-gray-600" />} />
              <CustomerStat label="New this month" value={customerData.new_this_month.toLocaleString()} description="Joined in the current month" icon={<ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />} highlight={customerData.new_this_month > 0} />
              <CustomerStat label="New today" value={customerData.new_today.toLocaleString()} description="Registered today" icon={<ArrowTrendingUpIcon className="h-5 w-5 text-blue-600" />} highlight={customerData.new_today > 0} />
            </div>
          ) : null}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-semibold text-gray-900">Top products by revenue</h2>
            <p className="text-xs text-gray-400 mt-0.5">Based on selected period</p>
          </div>
          {analyticsLoading ? (
            <ChartSkeleton height={200} />
          ) : topProducts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-400">No product sales in this period</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topProducts.map((product, idx) => (
                <div key={product.name} className="px-5 py-3.5 flex items-center gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate pr-4">{product.name}</p>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-xs text-gray-500">{product.units_sold} sold</span>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums w-24 text-right">
                          {formatPrice(product.revenue)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${(product.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reports Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-semibold text-gray-900">Reports</h2>
            <p className="text-xs text-gray-400 mt-0.5">Generate detailed reports and download as PDF</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
            {REPORT_TYPES.map((report) => (
              <button
                key={report.type}
                onClick={() => setActiveReport(report.type)}
                disabled={!dataReady}
                className="text-left p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <report.icon className="h-6 w-6 text-gray-400 group-hover:text-gray-700 transition-colors mb-3" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{report.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{report.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Viewer Modal */}
      {activeReport && analytics && (
        <ReportModal
          type={activeReport}
          analytics={analytics}
          salesData={salesData ?? null}
          customerData={customerData ?? null}
          monthlyData={monthlyData}
          periodLabel={periodLabel}
          onDownload={() => handleDownloadPdf(activeReport)}
          onClose={() => setActiveReport(null)}
        />
      )}
    </>
  );
}

// --- Report Viewer Modal ---

function ReportModal({
  type,
  analytics,
  salesData,
  customerData,
  monthlyData,
  periodLabel,
  onDownload,
  onClose,
}: {
  type: ReportType;
  analytics: AnalyticsData;
  salesData: SalesData | null;
  customerData: CustomerData | null;
  monthlyData: { label: string; revenue: number; orders: number }[];
  periodLabel: string;
  onDownload: () => void;
  onClose: () => void;
}) {
  const config = REPORT_TYPES.find((r) => r.type === type)!;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 mt-8 mb-8 max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{periodLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Download PDF
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {type === 'sales' && <SalesReportView analytics={analytics} />}
          {type === 'products' && <ProductReportView products={analytics.top_products} />}
          {type === 'financial' && <FinancialReportView breakdown={analytics.sales_breakdown} salesData={salesData} />}
          {type === 'customers' && <CustomerReportView customerData={customerData} monthlyData={monthlyData} />}
        </div>
      </div>
    </div>
  );
}

// --- Report Content Views ---

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3">
      <p className="text-[11px] text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

function SalesReportView({ analytics }: { analytics: AnalyticsData }) {
  const { metrics, sales_over_time } = analytics;
  const totSales = sales_over_time.reduce((s, r) => s + r.sales, 0);
  const totOrders = sales_over_time.reduce((s, r) => s + r.orders, 0);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <ReportStat label="Total Sales" value={formatPrice(metrics.total_sales)} />
        <ReportStat label="Orders" value={metrics.total_orders.toLocaleString()} />
        <ReportStat label="Avg. Order Value" value={formatPrice(metrics.avg_order_value)} />
        <ReportStat label="Net Sales" value={formatPrice(analytics.sales_breakdown.net_sales)} />
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-right px-4 py-3 font-medium">Sales</th>
              <th className="text-right px-4 py-3 font-medium">Orders</th>
              <th className="text-right px-4 py-3 font-medium">Avg. Order</th>
            </tr>
          </thead>
          <tbody>
            {sales_over_time.map((row, i) => (
              <tr key={row.date} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                <td className="px-4 py-2.5 text-gray-700">{row.date}</td>
                <td className="px-4 py-2.5 text-right text-gray-900 tabular-nums">{formatPrice(row.sales)}</td>
                <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{row.orders}</td>
                <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">
                  {row.orders > 0 ? formatPrice(Math.round(row.sales / row.orders)) : 'Rs. 0'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold border-t border-gray-200">
              <td className="px-4 py-3 text-gray-900">TOTAL</td>
              <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{formatPrice(totSales)}</td>
              <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{totOrders}</td>
              <td className="px-4 py-3 text-right text-gray-900 tabular-nums">
                {totOrders > 0 ? formatPrice(Math.round(totSales / totOrders)) : 'Rs. 0'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function ProductReportView({ products }: { products: AnalyticsData['top_products'] }) {
  const totalUnits = products.reduce((s, p) => s + p.units_sold, 0);
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <ReportStat label="Products" value={String(products.length)} />
        <ReportStat label="Total Units Sold" value={totalUnits.toLocaleString()} />
        <ReportStat label="Total Revenue" value={formatPrice(totalRevenue)} />
      </div>
      {products.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No product data for this period</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-center px-3 py-3 font-medium w-10">#</th>
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-right px-4 py-3 font-medium">Units Sold</th>
                <th className="text-right px-4 py-3 font-medium">Revenue</th>
                <th className="text-right px-4 py-3 font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                  <td className="px-3 py-2.5 text-center text-gray-500 font-medium">{i + 1}</td>
                  <td className="px-4 py-2.5 text-gray-900 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{p.units_sold}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900 tabular-nums">{formatPrice(p.revenue)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                    {totalRevenue > 0 ? `${((p.revenue / totalRevenue) * 100).toFixed(1)}%` : '0%'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold border-t border-gray-200">
                <td className="px-3 py-3" />
                <td className="px-4 py-3 text-gray-900">TOTAL</td>
                <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{totalUnits}</td>
                <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{formatPrice(totalRevenue)}</td>
                <td className="px-4 py-3 text-right text-gray-900">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}

function FinancialReportView({
  breakdown,
  salesData,
}: {
  breakdown: AnalyticsData['sales_breakdown'];
  salesData: SalesData | null;
}) {
  const rows: { label: string; value: number; bold?: boolean; negative?: boolean }[] = [
    { label: 'Gross Sales', value: breakdown.gross_sales },
    { label: 'Less: Discounts', value: breakdown.discounts, negative: true },
    { label: 'Less: Returns', value: breakdown.returns, negative: true },
    { label: 'Net Sales', value: breakdown.net_sales, bold: true },
    { label: 'Shipping Charges', value: breakdown.shipping },
    { label: 'Tax Collected', value: breakdown.tax },
    { label: 'Total Sales', value: breakdown.total_sales, bold: true },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <ReportStat label="Gross Sales" value={formatPrice(breakdown.gross_sales)} />
        <ReportStat label="Net Sales" value={formatPrice(breakdown.net_sales)} />
        <ReportStat label="Total Sales" value={formatPrice(breakdown.total_sales)} />
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-right px-4 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={clsx(
                  row.bold ? 'bg-gray-100 font-semibold' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70',
                )}
              >
                <td className={clsx('px-4 py-2.5', row.bold ? 'text-gray-900' : 'text-gray-700')}>
                  {row.label}
                </td>
                <td
                  className={clsx(
                    'px-4 py-2.5 text-right tabular-nums',
                    row.negative && row.value > 0 ? 'text-red-600' : row.bold ? 'text-gray-900' : 'text-gray-700',
                  )}
                >
                  {row.negative && row.value > 0 ? `-${formatPrice(row.value)}` : formatPrice(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {salesData && (
        <>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Revenue Overview</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-medium">Period</th>
                  <th className="text-right px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="px-4 py-2.5 text-gray-700">All-Time</td>
                  <td className="px-4 py-2.5 text-right text-gray-900 font-semibold tabular-nums">{formatPrice(salesData.total_revenue)}</td>
                </tr>
                <tr className="bg-gray-50/70">
                  <td className="px-4 py-2.5 text-gray-700">This Month</td>
                  <td className="px-4 py-2.5 text-right text-gray-900 font-semibold tabular-nums">{formatPrice(salesData.month_revenue)}</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-2.5 text-gray-700">Today</td>
                  <td className="px-4 py-2.5 text-right text-gray-900 font-semibold tabular-nums">{formatPrice(salesData.today_revenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function CustomerReportView({
  customerData,
  monthlyData,
}: {
  customerData: CustomerData | null;
  monthlyData: { label: string; revenue: number; orders: number }[];
}) {
  if (!customerData) {
    return <p className="text-sm text-gray-400 text-center py-8">Loading customer data...</p>;
  }

  const totalOrders = monthlyData.reduce((s, m) => s + m.orders, 0);
  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <ReportStat label="Total Customers" value={customerData.total_customers.toLocaleString()} />
        <ReportStat label="New This Month" value={customerData.new_this_month.toLocaleString()} />
        <ReportStat label="New Today" value={customerData.new_today.toLocaleString()} />
      </div>

      {monthlyData.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Monthly Order Trend</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left px-4 py-3 font-medium">Month</th>
                  <th className="text-right px-4 py-3 font-medium">Orders</th>
                  <th className="text-right px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, i) => (
                  <tr key={m.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                    <td className="px-4 py-2.5 text-gray-700">{m.label}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums">{m.orders}</td>
                    <td className="px-4 py-2.5 text-right text-gray-900 tabular-nums">{formatPrice(m.revenue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold border-t border-gray-200">
                  <td className="px-4 py-3 text-gray-900">TOTAL</td>
                  <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{totalOrders}</td>
                  <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{formatPrice(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// --- Shared Sub-components ---

function MetricCard({ label, value, change }: { label: string; value: string; change: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="text-[13px] text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
      <ChangeIndicator value={change} className="mt-1" />
    </div>
  );
}

function BreakdownRow({ label, value, bold, large, isNegative }: { label: string; value: number; bold?: boolean; large?: boolean; isNegative?: boolean }) {
  const display = isNegative && value !== 0 ? `-${formatPrice(Math.abs(value))}` : formatPrice(Math.abs(value));
  return (
    <div className="flex items-center justify-between py-2">
      <span className={clsx(large ? 'text-sm' : 'text-[13px]', bold ? 'font-semibold text-gray-900' : 'text-gray-600')}>{label}</span>
      <span className={clsx('tabular-nums', large ? 'text-sm' : 'text-[13px]', bold ? 'font-semibold text-gray-900' : 'text-gray-700', isNegative && value !== 0 && 'text-red-600')}>{display}</span>
    </div>
  );
}

function SummaryCard({ icon, label, value, bgColor }: { icon: React.ReactNode; label: string; value: string; bgColor: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <div className={clsx('flex items-center justify-center w-10 h-10 rounded-lg', bgColor)}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function CustomerStat({ label, value, description, icon, highlight }: { label: string; value: string; description: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="px-5 py-5 flex items-start gap-3.5">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={clsx('text-2xl font-semibold', highlight ? 'text-green-600' : 'text-gray-900')}>{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
