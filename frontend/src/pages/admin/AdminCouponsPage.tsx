import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
  TicketIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { ReceiptPercentIcon, TagIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { adminCouponsApi } from '@/api/admin.api';
import { APP_NAME } from '@/utils/constants';
import type { Coupon } from '@/types/coupon';

// --- Status helpers ---

type DiscountStatus = 'active' | 'expired' | 'scheduled' | 'inactive';

function getStatus(c: Coupon): DiscountStatus {
  const now = new Date();
  if (c.starts_at && new Date(c.starts_at) > now) return 'scheduled';
  if (c.expires_at && new Date(c.expires_at) < now) return 'expired';
  if (!c.is_active) return 'inactive';
  return 'active';
}

const STATUS_BADGE: Record<DiscountStatus, { label: string; bg: string; text: string; dot: string }> = {
  active: { label: 'Active', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  expired: { label: 'Expired', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  scheduled: { label: 'Scheduled', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  inactive: { label: 'Inactive', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

type SortOption = 'newest' | 'oldest' | 'code_asc' | 'code_desc';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  code_asc: 'Code A–Z',
  code_desc: 'Code Z–A',
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'scheduled', label: 'Scheduled' },
];

// --- Component ---

export default function AdminCouponsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusTab, setStatusTab] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // --- Query ---

  const PAGE_SIZE = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'coupons', page],
    queryFn: () =>
      adminCouponsApi.list({ page, page_size: PAGE_SIZE }).then((r) => r.data),
  });

  const rawCoupons: Coupon[] = data?.items ?? data?.results ?? (Array.isArray(data) ? data : []);
  const totalCount = data?.total ?? rawCoupons.length;
  const totalPages = data?.total_pages ?? Math.ceil(totalCount / PAGE_SIZE);

  // Client-side: search + status filter + sort
  const coupons = (() => {
    let filtered = [...rawCoupons];

    // Search
    if (searchInput.trim()) {
      const q = searchInput.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)),
      );
    }

    // Status tab
    if (statusTab) {
      filtered = filtered.filter((c) => getStatus(c) === statusTab);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
        break;
      case 'oldest':
        filtered.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
        break;
      case 'code_asc':
        filtered.sort((a, b) => a.code.localeCompare(b.code));
        break;
      case 'code_desc':
        filtered.sort((a, b) => b.code.localeCompare(a.code));
        break;
    }

    return filtered;
  })();

  // --- Mutations ---

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await adminCouponsApi.delete(id);
      }
    },
    onSuccess: () => {
      toast.success('Discount(s) deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      setSelectedIds(new Set());
      setShowBulkDelete(false);
    },
    onError: () => toast.error('Failed to delete discount(s)'),
  });

  // --- Selection ---

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === coupons.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(coupons.map((c) => c.id)));
    }
  }

  // --- Helpers ---

  function formatDiscountValue(c: Coupon) {
    return c.type === 'percentage' ? `${c.value}% off` : `Rs ${c.value.toLocaleString()} off`;
  }

  function formatDateRange(c: Coupon) {
    const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (c.starts_at && c.expires_at) return `${fmt(c.starts_at)} – ${fmt(c.expires_at)}`;
    if (c.starts_at) return `From ${fmt(c.starts_at)}`;
    if (c.expires_at) return `Until ${fmt(c.expires_at)}`;
    return 'No end date';
  }

  // --- Render ---

  const hasData = rawCoupons.length > 0;
  const isEmpty = !isLoading && rawCoupons.length === 0 && !searchInput && !statusTab;

  return (
    <>
      <Helmet>
        <title>Discounts | {APP_NAME} Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <TicketIcon className="h-5 w-5 text-gray-500" />
              Discounts
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Create and manage discount codes</p>
          </div>
          <button
            onClick={() => setShowTypeModal(true)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Create discount
          </button>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Empty state */}
          {isEmpty ? (
            <div className="py-16 text-center">
              <TicketIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Manage discounts and promotions
              </h3>
              <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                Create discount codes and automatic discounts that apply at checkout.
              </p>
              <button
                onClick={() => setShowTypeModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Create discount
              </button>
            </div>
          ) : (
            <>
              {/* Status tabs */}
              <div className="flex items-center justify-between border-b border-gray-200 px-4">
                <div className="flex items-center gap-0">
                  {STATUS_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => {
                        setStatusTab(tab.value);
                        setSelectedIds(new Set());
                      }}
                      className={clsx(
                        'px-4 py-3 text-sm font-medium -mb-px transition-colors',
                        statusTab === tab.value
                          ? 'border-b-2 border-gray-900 text-gray-900'
                          : 'text-gray-500 hover:text-gray-700',
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Sort */}
                <div ref={sortRef} className="relative">
                  <button
                    onClick={() => setSortOpen(!sortOpen)}
                    className={clsx(
                      'p-2 rounded-lg transition-colors',
                      sortOpen || sortBy !== 'newest'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
                    )}
                    title="Sort"
                  >
                    <ArrowsUpDownIcon className="h-4 w-4" />
                  </button>

                  {sortOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-30">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">Sort by</p>
                      </div>
                      <div className="py-1">
                        {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(
                          ([val, label]) => (
                            <button
                              key={val}
                              onClick={() => {
                                setSortBy(val);
                                setSortOpen(false);
                              }}
                              className={clsx(
                                'w-full text-left px-4 py-2 text-sm transition-colors',
                                sortBy === val
                                  ? 'bg-gray-50 text-gray-900 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50',
                              )}
                            >
                              {label}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search bar */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="relative max-w-md">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search discounts..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
              </div>

              {/* Bulk action bar */}
              {selectedIds.size > 0 && (
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-4">
                  <span className="text-sm text-blue-700 font-medium">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={() => setShowBulkDelete(true)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Delete selected
                  </button>
                </div>
              )}

              {/* Table */}
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                </div>
              ) : coupons.length === 0 ? (
                <div className="p-12 text-center">
                  <TicketIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No discounts match your filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === coupons.length && coupons.length > 0}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 border-gray-300 rounded text-gray-900 focus:ring-gray-500"
                          />
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Discount
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Type
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Usage
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Dates
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((coupon) => {
                        const status = getStatus(coupon);
                        const badge = STATUS_BADGE[status];
                        return (
                          <tr
                            key={coupon.id}
                            className={clsx(
                              'border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer',
                              selectedIds.has(coupon.id) && 'bg-blue-50/50 hover:bg-blue-50/50',
                            )}
                            onClick={() => navigate(`/admin/coupons/${coupon.id}`)}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(coupon.id)}
                                onChange={() => toggleSelect(coupon.id)}
                                className="h-4 w-4 border-gray-300 rounded text-gray-900 focus:ring-gray-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900 font-mono">
                                  {coupon.code}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {formatDiscountValue(coupon)}
                                  {coupon.description && ` · ${coupon.description}`}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-sm text-gray-600">
                                {coupon.type === 'percentage' ? 'Percentage' : 'Fixed amount'}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-sm text-gray-600">
                                {coupon.used_count}
                                {coupon.usage_limit != null && ` / ${coupon.usage_limit}`}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span className="text-sm text-gray-500">
                                {formatDateRange(coupon)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer / Pagination */}
              {hasData && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    {coupons.length} discount{coupons.length !== 1 ? 's' : ''}
                    {(searchInput || statusTab) && rawCoupons.length !== coupons.length
                      ? ` of ${rawCoupons.length}`
                      : ''}
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Type selection modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowTypeModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">
                Select discount type
              </h2>
              <button
                onClick={() => setShowTypeModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              <button
                onClick={() => {
                  setShowTypeModal(false);
                  navigate('/admin/coupons/new?type=order');
                }}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <ReceiptPercentIcon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Amount off order</p>
                  <p className="text-sm text-gray-500">Discount the total order amount</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              </button>
              <button
                onClick={() => {
                  setShowTypeModal(false);
                  navigate('/admin/coupons/new?type=products');
                }}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <TagIcon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Amount off products</p>
                  <p className="text-sm text-gray-500">
                    Discount specific products or collections
                  </p>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowTypeModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowBulkDelete(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">
                Delete {selectedIds.size} discount{selectedIds.size > 1 ? 's' : ''}
              </h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete {selectedIds.size} discount
                {selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowBulkDelete(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setBulkDeleting(true);
                  deleteMutation.mutate([...selectedIds], {
                    onSettled: () => setBulkDeleting(false),
                  });
                }}
                disabled={bulkDeleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
