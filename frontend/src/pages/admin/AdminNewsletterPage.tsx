import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  EnvelopeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import { adminNewsletterApi } from '@/api/admin.api';
import { formatDate } from '@/utils/formatters';

type StatusFilter = 'all' | 'active' | 'unsubscribed';

interface Subscriber {
  id: number;
  email: string;
  is_active: boolean;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
];

export default function AdminNewsletterPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [exporting, setExporting] = useState(false);

  const queryParams: Record<string, unknown> = { page, page_size: 20 };
  if (statusFilter === 'active') queryParams.is_active = true;
  if (statusFilter === 'unsubscribed') queryParams.is_active = false;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'newsletter', page, statusFilter],
    queryFn: () => adminNewsletterApi.list(queryParams).then((res) => res.data),
  });

  const subscribers: Subscriber[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await adminNewsletterApi.exportCsv();
      const csvContent = response.data;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  function handleFilterChange(filter: StatusFilter) {
    setStatusFilter(filter);
    setPage(1);
  }

  return (
    <>
      <Helmet>
        <title>Newsletter | Admin - My Brand</title>
      </Helmet>

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-gray-500" />
              Newsletter
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage newsletter subscribers</p>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {/* Card with tabs + table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Status Tabs */}
          <div className="border-b border-gray-200 px-5">
            <div className="flex gap-0">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleFilterChange(tab.value)}
                  className={clsx(
                    'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                    statusFilter === tab.value
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : subscribers.length === 0 ? (
            <div className="py-16 text-center">
              <EnvelopeIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                No subscribers found
              </p>
              <p className="text-sm text-gray-500">
                {statusFilter === 'active'
                  ? 'No active subscribers yet'
                  : statusFilter === 'unsubscribed'
                    ? 'No unsubscribed users'
                    : 'Subscribers will appear here when users sign up'}
              </p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscribed
                      </th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unsubscribed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((subscriber) => (
                      <tr
                        key={subscriber.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-5">
                          <span className="font-medium text-gray-900">
                            {subscriber.email}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                              subscriber.is_active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            )}
                          >
                            <span
                              className={clsx(
                                'w-1.5 h-1.5 rounded-full',
                                subscriber.is_active
                                  ? 'bg-green-500'
                                  : 'bg-gray-400'
                              )}
                            />
                            {subscriber.is_active ? 'Active' : 'Unsubscribed'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-gray-600">
                          {subscriber.subscribed_at
                            ? formatDate(subscriber.subscribed_at)
                            : '--'}
                        </td>
                        <td className="py-3 px-5 text-gray-600">
                          {subscriber.unsubscribed_at
                            ? formatDate(subscriber.unsubscribed_at)
                            : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {total} subscriber{total !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <span className="px-3 text-sm text-gray-600">
                      {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
