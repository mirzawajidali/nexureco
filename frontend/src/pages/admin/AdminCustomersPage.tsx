import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid';
import {
  ArrowsUpDownIcon,
  PlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { adminCustomersApi } from '@/api/admin.api';
import { formatPrice } from '@/utils/formatters';
import Spinner from '@/components/ui/Spinner';
import type { CustomerListItem } from '@/types/user';

// --- Constants ---

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Date added (newest first)' },
  { key: 'oldest', label: 'Date added (oldest first)' },
  { key: 'name_asc', label: 'Name (A-Z)' },
  { key: 'name_desc', label: 'Name (Z-A)' },
];

// --- Helpers ---

function getLocation(customer: CustomerListItem): string {
  const parts: string[] = [];
  if (customer.city) parts.push(customer.city);
  if (customer.country) parts.push(customer.country);
  return parts.join(', ') || '—';
}

// --- Component ---

export default function AdminCustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'newest';

  const [searchInput, setSearchInput] = useState(search);
  const [showSort, setShowSort] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'customers', page, search, sort],
    queryFn: () =>
      adminCustomersApi.list({
        page,
        page_size: PAGE_SIZE,
        ...(search && { q: search }),
        sort,
      }),
  });

  const customers: CustomerListItem[] = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.total_pages ?? 1;

  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  // --- Handlers ---

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams(searchParams);
    if (searchInput) p.set('q', searchInput);
    else p.delete('q');
    p.set('page', '1');
    setSearchParams(p);
  }

  function handleSort(key: string) {
    const p = new URLSearchParams(searchParams);
    p.set('sort', key);
    p.set('page', '1');
    setSearchParams(p);
    setShowSort(false);
  }

  function handlePageChange(newPage: number) {
    const p = new URLSearchParams(searchParams);
    p.set('page', String(newPage));
    setSearchParams(p);
  }

  function toggleSelectAll() {
    if (selected.length === customers.length) {
      setSelected([]);
    } else {
      setSelected(customers.map((c) => c.id));
    }
  }

  function toggleSelect(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  return (
    <>
      <Helmet>
        <title>Customers | Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-gray-500" />
              Customers
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">View and manage your customer base</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/customers/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add customer
            </Link>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Search & Sort bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search customers"
                className="w-full pl-9 pr-3 py-[7px] border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </form>
            <div className="relative">
              <button
                onClick={() => setShowSort(!showSort)}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Sort"
              >
                <ArrowsUpDownIcon className="h-4 w-4 text-gray-600" />
              </button>
              {showSort && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 w-64">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => handleSort(opt.key)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          sort === opt.key ? 'text-gray-900 font-medium bg-gray-50' : 'text-gray-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-sm">No customers found</p>
              {search && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    const p = new URLSearchParams(searchParams);
                    p.delete('q');
                    p.set('page', '1');
                    setSearchParams(p);
                  }}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.length === customers.length && customers.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Customer name
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                      Email subscription
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                      Location
                    </th>
                    <th className="text-right px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="text-right px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                      Amount spent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(customer.id)}
                          onChange={() => toggleSelect(customer.id)}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          to={`/admin/customers/${customer.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {customer.first_name} {customer.last_name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-gray-600 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${customer.email ? 'bg-green-500' : 'bg-gray-300'}`} />
                          {customer.email ? 'Subscribed' : 'Not subscribed'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 hidden lg:table-cell">
                        {getLocation(customer)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-900">
                        {customer.orders_count}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-900 hidden sm:table-cell">
                        {formatPrice(customer.total_spent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {total} {total === 1 ? 'customer' : 'customers'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
                </button>
                <span className="text-sm text-gray-700 min-w-[80px] text-center">
                  {startIndex}–{endIndex} of {total}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
