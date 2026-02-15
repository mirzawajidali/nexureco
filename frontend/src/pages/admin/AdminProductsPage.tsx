import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/20/solid';
import { PhotoIcon, CalendarDaysIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { adminProductsApi, adminCategoriesApi } from '@/api/admin.api';
import { formatPrice } from '@/utils/formatters';
import { APP_NAME } from '@/utils/constants';
import type { ProductListItem, Category } from '@/types/product';
import type { PaginatedResponse } from '@/types/common';
import Spinner from '@/components/ui/Spinner';

// --- Constants ---

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-50 text-yellow-700',
  archived: 'bg-gray-100 text-gray-600',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name_asc', label: 'A–Z' },
  { value: 'name_desc', label: 'Z–A' },
  { value: 'price_asc', label: 'Price (low → high)' },
  { value: 'price_desc', label: 'Price (high → low)' },
];

const STOCK_FILTERS = [
  { value: '', label: 'All' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
];

const PAGE_SIZE = 20;

// --- Component ---

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Dropdown states
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter state
  const [stockFilter, setStockFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // URL params
  const page = Number(searchParams.get('page') ?? '1');
  const q = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const sort = searchParams.get('sort') ?? 'newest';

  // --- Queries ---

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'products', { page, q, status, sort }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, page_size: PAGE_SIZE, sort };
      if (q) params.q = q;
      if (status) params.status = status;
      const res = await adminProductsApi.list(params);
      return res.data as PaginatedResponse<ProductListItem>;
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const res = await adminCategoriesApi.list();
      return (res.data ?? []) as Category[];
    },
    staleTime: 60000,
  });

  const categories = categoriesData ?? [];

  // --- Mutations ---

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminProductsApi.delete(id),
    onSuccess: () => {
      toast.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => adminProductsApi.bulkDelete(ids),
    onSuccess: (res) => {
      const deleted = res.data?.deleted ?? 0;
      toast.success(`${deleted} product${deleted !== 1 ? 's' : ''} deleted`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
    },
    onError: () => toast.error('Failed to delete products'),
  });

  // --- Click-outside for dropdowns ---

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Param helpers ---

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setParam('q', searchInput.trim());
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  }

  // --- Select helpers ---

  const allProducts = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;

  // Apply client-side filters
  const products = allProducts.filter((p) => {
    if (stockFilter === 'in_stock' && p.total_stock <= 0) return false;
    if (stockFilter === 'out_of_stock' && p.total_stock > 0) return false;
    if (categoryFilter && p.category_name !== categoryFilter) return false;
    return true;
  });

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  // --- Inventory text ---

  function getInventoryText(p: ProductListItem): { text: string; color: string } {
    if (p.variant_count === 0) {
      return { text: '0 in stock', color: 'text-gray-500' };
    }
    if (p.total_stock <= 0) {
      return {
        text: p.variant_count > 1 ? `0 in stock for ${p.variant_count} variants` : '0 in stock',
        color: 'text-red-600',
      };
    }
    return {
      text: p.variant_count > 1
        ? `${p.total_stock} in stock for ${p.variant_count} variants`
        : `${p.total_stock} in stock`,
      color: 'text-gray-700',
    };
  }

  // --- Export ---

  async function handleExport() {
    setExporting(true);
    try {
      const params: Record<string, unknown> = {};
      if (q) params.q = q;
      if (status) params.status = status;
      const res = await adminProductsApi.exportCsv(params);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Products exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  // --- Import ---

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await adminProductsApi.importCsv(formData);
      const { created, errors } = res.data;
      if (created > 0) {
        toast.success(`${created} product${created !== 1 ? 's' : ''} imported`);
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      }
      if (errors?.length > 0) {
        toast.error(`${errors.length} row${errors.length !== 1 ? 's' : ''} had errors`);
      }
      setImportModalOpen(false);
      setImportFile(null);
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  }

  // --- Pagination range ---

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  // --- Active filters indicator ---
  const hasActiveFilters = !!stockFilter || !!categoryFilter;

  // --- Product stats computation ---
  const stats = (() => {
    const items = allProducts;
    if (items.length === 0) return null;

    const totalStock = items.reduce((sum, p) => sum + p.total_stock, 0);
    const totalSold = items.reduce((sum, p) => sum + p.total_sold, 0);
    const sellThrough = totalSold + totalStock > 0
      ? Math.round((totalSold / (totalSold + totalStock)) * 100)
      : 0;

    // ABC analysis: A = top 80% revenue, B = next 15%, C = bottom 5%
    const sorted = [...items]
      .map((p) => ({ ...p, revenue: p.base_price * p.total_sold }))
      .sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
    let cumulative = 0;
    let aCount = 0;
    let bCount = 0;
    for (const p of sorted) {
      cumulative += p.revenue;
      if (totalRevenue > 0 && cumulative <= totalRevenue * 0.8) aCount++;
      else if (totalRevenue > 0 && cumulative <= totalRevenue * 0.95) bCount++;
    }
    const cCount = items.length - aCount - bCount;

    return { sellThrough, totalSold, aCount, bCount, cCount };
  })();

  return (
    <>
      <Helmet>
        <title>Products | {APP_NAME} Admin</title>
      </Helmet>

      <div className="space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingBagIcon className="h-5 w-5 text-gray-500" />
              Products
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your product catalog</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Import
            </button>
            <Link to="/admin/products/new">
              <button className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
                Add product
              </button>
            </Link>
          </div>
        </div>

        {/* Product Stats Bar */}
        {!isLoading && allProducts.length > 0 && stats && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="grid grid-cols-3 divide-x divide-gray-200">
              {/* Sell-through rate */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-medium text-gray-500">Average sell-through rate</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-gray-900">{stats.sellThrough}%</span>
                  <span className="text-sm text-gray-400">&mdash;</span>
                </div>
              </div>

              {/* Total sold */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-medium text-gray-500">Total units sold</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-gray-900">
                    {stats.totalSold > 0 ? stats.totalSold.toLocaleString() : 'No data'}
                  </span>
                </div>
              </div>

              {/* ABC analysis */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-xs font-medium text-gray-500">ABC product analysis</p>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-semibold text-gray-900">{stats.aCount} <span className="text-sm font-medium text-green-600">A</span></span>
                  <span className="text-lg font-semibold text-gray-900">{stats.bCount} <span className="text-sm font-medium text-yellow-600">B</span></span>
                  <span className="text-lg font-semibold text-gray-900">{stats.cCount} <span className="text-sm font-medium text-gray-400">C</span></span>
                </div>
              </div>
            </div>

            {/* Time range tag */}
            <div className="border-t border-gray-100 px-5 py-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600 font-medium">
                <CalendarDaysIcon className="h-3.5 w-3.5" />
                30 days
              </span>
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
                    key={tab.value}
                    onClick={() => setParam('status', tab.value)}
                    className={clsx(
                      'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                      status === tab.value
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

          {/* Search + filter + sort row */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products"
                className="w-full pl-9 pr-3 py-[7px] text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder:text-gray-400"
              />
            </form>

            {/* Filter button */}
            <div ref={filterRef} className="relative">
              <button
                onClick={() => { setFilterOpen(!filterOpen); setSortOpen(false); }}
                className={clsx(
                  'p-[7px] border rounded-lg transition-colors',
                  hasActiveFilters
                    ? 'border-blue-400 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-500 hover:bg-gray-50',
                )}
                title="Filter"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>

              {/* Filter dropdown */}
              {filterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                    >
                      <option value="">All categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Stock status</label>
                    <div className="space-y-1.5">
                      {STOCK_FILTERS.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="stock"
                            checked={stockFilter === opt.value}
                            onChange={() => setStockFilter(opt.value)}
                            className="h-3.5 w-3.5 text-gray-900 focus:ring-gray-500"
                          />
                          <span className="text-sm text-gray-700">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={() => { setStockFilter(''); setCategoryFilter(''); }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sort button */}
            <div ref={sortRef} className="relative">
              <button
                onClick={() => { setSortOpen(!sortOpen); setFilterOpen(false); }}
                className={clsx(
                  'p-[7px] border rounded-lg transition-colors',
                  sort !== 'newest'
                    ? 'border-blue-400 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-500 hover:bg-gray-50',
                )}
                title="Sort"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h12M3 17h6" />
                </svg>
              </button>

              {/* Sort dropdown */}
              {sortOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setParam('sort', opt.value === 'newest' ? '' : opt.value);
                        setSortOpen(false);
                      }}
                      className={clsx(
                        'w-full text-left px-4 py-2 text-sm transition-colors',
                        sort === opt.value || (!sort && opt.value === 'newest')
                          ? 'text-gray-900 font-medium bg-gray-50'
                          : 'text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active search/filter indicators */}
          {(q || hasActiveFilters) && (
            <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              {q && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-700">
                  Search: {q}
                  <button onClick={() => { setSearchInput(''); setParam('q', ''); }} className="hover:text-gray-900">
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-700">
                  Category: {categoryFilter}
                  <button onClick={() => setCategoryFilter('')} className="hover:text-gray-900">
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {stockFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-700">
                  Stock: {STOCK_FILTERS.find((f) => f.value === stockFilter)?.label}
                  <button onClick={() => setStockFilter('')} className="hover:text-gray-900">
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-4">
              <span className="text-sm text-blue-700 font-medium">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Delete selected
              </button>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <PhotoIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500">
                {q || status || hasActiveFilters
                  ? 'No products match your filters.'
                  : 'No products yet. Add your first product to get started.'}
              </p>
              {!q && !status && !hasActiveFilters && (
                <Link to="/admin/products/new" className="inline-block mt-4">
                  <button className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
                    Add product
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="w-10 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === products.length && products.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">
                        Product
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">
                        Status
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">
                        Inventory
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 hidden lg:table-cell">
                        Category
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((product) => {
                      const inventory = getInventoryText(product);
                      return (
                        <tr
                          key={product.id}
                          className={clsx(
                            'hover:bg-gray-50/50 transition-colors cursor-pointer',
                            selectedIds.has(product.id) && 'bg-blue-50/50 hover:bg-blue-50/50',
                          )}
                          onClick={() => navigate(`/admin/products/${product.id}`)}
                        >
                          <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(product.id)}
                              onChange={() => toggleSelect(product.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>

                          {/* Product */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0">
                                {product.primary_image ? (
                                  <img
                                    src={product.primary_image}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <PhotoIcon className="h-4 w-4 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {product.name}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2.5">
                            <span
                              className={clsx(
                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                                STATUS_STYLES[product.status] ?? 'bg-gray-100 text-gray-600',
                              )}
                            >
                              {product.status}
                            </span>
                          </td>

                          {/* Inventory */}
                          <td className="px-3 py-2.5">
                            <span className={clsx('text-sm', inventory.color)}>
                              {inventory.text}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="px-3 py-2.5 hidden lg:table-cell">
                            <span className="text-sm text-gray-500">
                              {product.category_name ?? '—'}
                            </span>
                          </td>

                          {/* Price */}
                          <td className="px-3 py-2.5 text-right hidden md:table-cell">
                            <span className="text-sm text-gray-900">
                              {formatPrice(product.base_price)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center border-t border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <span className="text-sm text-gray-700 min-w-[80px] text-center">
                    {rangeStart}–{rangeEnd} of {total}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Single Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delete product</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{deleteTarget.name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setBulkDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Delete {selectedIds.size} product{selectedIds.size > 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete {selectedIds.size} selected product
              {selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                disabled={bulkDeleteMutation.isPending}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => { setImportModalOpen(false); setImportFile(null); }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Import products</h2>
              <button
                onClick={() => { setImportModalOpen(false); setImportFile(null); }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-4 hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('csv-file-input')?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file && file.name.endsWith('.csv')) setImportFile(file);
                else toast.error('Please select a CSV file');
              }}
            >
              <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              {importFile ? (
                <p className="text-sm text-gray-900 font-medium">{importFile.name}</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-1">Drop CSV file here or click to browse</p>
                  <p className="text-xs text-gray-400">
                    Columns: Name, Status, SKU, Price, Compare Price, Stock, Category, Tags
                  </p>
                </>
              )}
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setImportFile(file);
                }}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setImportModalOpen(false); setImportFile(null); }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
