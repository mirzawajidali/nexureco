import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  RectangleGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { adminCollectionsApi } from '@/api/admin.api';
import { APP_NAME } from '@/utils/constants';

// --- Types ---

interface Collection {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  type: string;
  is_featured: boolean;
  is_active: boolean;
  product_count: number;
  created_at?: string;
}

type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'products_desc' | 'products_asc';
type TypeFilter = 'all' | 'manual' | 'automated';
type StatusFilter = 'all' | 'active' | 'inactive';

// --- Component ---

export default function AdminCollectionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Filter & Sort state
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all';

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // --- Queries ---

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'collections'],
    queryFn: () => adminCollectionsApi.list().then((res) => res.data),
  });

  const allCollections: Collection[] = Array.isArray(data)
    ? data
    : data?.results ?? data?.collections ?? [];

  // Apply search, filters, and sort
  const collections = (() => {
    let filtered = [...allCollections];

    // Search
    if (searchInput.trim()) {
      const q = searchInput.trim().toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((c) => c.type === typeFilter);
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter((c) => c.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((c) => !c.is_active);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
        break;
      case 'oldest':
        filtered.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
        break;
      case 'name_asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'products_desc':
        filtered.sort((a, b) => b.product_count - a.product_count);
        break;
      case 'products_asc':
        filtered.sort((a, b) => a.product_count - b.product_count);
        break;
    }

    return filtered;
  })();

  // --- Mutations ---

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminCollectionsApi.delete(id),
    onSuccess: () => {
      toast.success('Collection deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
      setDeleteTarget(null);
      setSelectedIds(new Set());
    },
    onError: () => toast.error('Failed to delete collection'),
  });

  // --- Selection helpers ---

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === collections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(collections.map((c) => c.id)));
    }
  }

  // --- Sort labels ---

  const sortLabels: Record<SortOption, string> = {
    newest: 'Newest',
    oldest: 'Oldest',
    name_asc: 'Title A–Z',
    name_desc: 'Title Z–A',
    products_desc: 'Most products',
    products_asc: 'Fewest products',
  };

  // --- Render ---

  return (
    <>
      <Helmet>
        <title>Collections | {APP_NAME} Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <RectangleGroupIcon className="h-5 w-5 text-gray-500" />
              Collections
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Group products into curated collections</p>
          </div>
          <button
            onClick={() => navigate('/admin/collections/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Add collection
          </button>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Tab row + icons */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4">
            <div className="flex items-center gap-0">
              <button className="px-4 py-3 text-sm font-medium border-b-2 border-gray-900 text-gray-900 -mb-px">
                All
              </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors ml-1"
                title="Add view"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setFilterOpen(false);
                  setSortOpen(false);
                }}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  searchOpen
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
                )}
                title="Search"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
              </button>

              {/* Filter button */}
              <div ref={filterRef} className="relative">
                <button
                  onClick={() => {
                    setFilterOpen(!filterOpen);
                    setSortOpen(false);
                  }}
                  className={clsx(
                    'p-2 rounded-lg transition-colors',
                    filterOpen || hasActiveFilters
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
                  )}
                  title="Filter"
                >
                  <FunnelIcon className="h-4 w-4" />
                  {hasActiveFilters && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </button>

                {filterOpen && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Filters</p>
                      {hasActiveFilters && (
                        <button
                          onClick={() => {
                            setTypeFilter('all');
                            setStatusFilter('all');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Type filter */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Collection type
                      </p>
                      <div className="space-y-1.5">
                        {(['all', 'manual', 'automated'] as const).map((val) => (
                          <label key={val} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="type_filter"
                              checked={typeFilter === val}
                              onChange={() => setTypeFilter(val)}
                              className="h-3.5 w-3.5 border-gray-300 text-gray-900 focus:ring-gray-500"
                            />
                            <span className="text-sm text-gray-700">
                              {val === 'all' ? 'All types' : val === 'manual' ? 'Manual' : 'Automated'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Status filter */}
                    <div className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Status
                      </p>
                      <div className="space-y-1.5">
                        {(['all', 'active', 'inactive'] as const).map((val) => (
                          <label key={val} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="status_filter"
                              checked={statusFilter === val}
                              onChange={() => setStatusFilter(val)}
                              className="h-3.5 w-3.5 border-gray-300 text-gray-900 focus:ring-gray-500"
                            />
                            <span className="text-sm text-gray-700">
                              {val === 'all' ? 'All statuses' : val === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sort button */}
              <div ref={sortRef} className="relative">
                <button
                  onClick={() => {
                    setSortOpen(!sortOpen);
                    setFilterOpen(false);
                  }}
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
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-30">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Sort by</p>
                    </div>
                    <div className="py-1">
                      {(Object.entries(sortLabels) as [SortOption, string][]).map(
                        ([value, label]) => (
                          <button
                            key={value}
                            onClick={() => {
                              setSortBy(value);
                              setSortOpen(false);
                            }}
                            className={clsx(
                              'w-full text-left px-4 py-2 text-sm transition-colors',
                              sortBy === value
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
          </div>

          {/* Search bar (expandable) */}
          {searchOpen && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
              <div className="relative max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search collections..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50/30 flex items-center gap-2 flex-wrap">
              {typeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  Type: {typeFilter === 'manual' ? 'Manual' : 'Automated'}
                  <button
                    onClick={() => setTypeFilter('all')}
                    className="p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  Status: {statusFilter === 'active' ? 'Active' : 'Inactive'}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-4">
              <span className="text-sm text-blue-700 font-medium">
                {selectedIds.size} selected
              </span>
              <button
                onClick={async () => {
                  if (!confirm(`Delete ${selectedIds.size} collection${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
                  setBulkDeleting(true);
                  try {
                    for (const cid of selectedIds) {
                      await adminCollectionsApi.delete(cid);
                    }
                    toast.success(`${selectedIds.size} collection${selectedIds.size > 1 ? 's' : ''} deleted`);
                    queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
                    setSelectedIds(new Set());
                  } catch {
                    toast.error('Failed to delete some collections');
                  } finally {
                    setBulkDeleting(false);
                  }
                }}
                disabled={bulkDeleting}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete selected'}
              </button>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : collections.length === 0 ? (
            <div className="p-12 text-center">
              <RectangleGroupIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {searchInput || hasActiveFilters
                  ? 'No collections match your filters.'
                  : 'No collections yet'}
              </p>
              {!searchInput && !hasActiveFilters && (
                <button
                  onClick={() => navigate('/admin/collections/new')}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Create your first collection
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.size === collections.length &&
                          collections.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 border-gray-300 rounded text-gray-900 focus:ring-gray-500"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Product conditions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map((collection) => (
                    <tr
                      key={collection.id}
                      className={clsx(
                        'border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer group',
                        selectedIds.has(collection.id) &&
                          'bg-blue-50/50 hover:bg-blue-50/50',
                      )}
                      onClick={() =>
                        navigate(`/admin/collections/${collection.id}`)
                      }
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(collection.id)}
                          onChange={() => toggleSelect(collection.id)}
                          className="h-4 w-4 border-gray-300 rounded text-gray-900 focus:ring-gray-500"
                        />
                      </td>

                      {/* Title with collection icon */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {collection.image_url ? (
                            <img
                              src={collection.image_url}
                              alt={collection.name}
                              className="w-10 h-10 rounded border border-gray-200 object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
                              <RectangleGroupIcon className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {collection.name}
                          </span>
                        </div>
                      </td>

                      {/* Product count */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">
                          {collection.product_count}
                        </span>
                      </td>

                      {/* Product conditions */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-gray-500">
                          {collection.type === 'automated' ? 'Automated' : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {collections.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {collections.length} collection
                {collections.length !== 1 ? 's' : ''}
                {(searchInput.trim() || hasActiveFilters) &&
                  allCollections.length !== collections.length &&
                  ` of ${allCollections.length}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">
                Delete collection
              </h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-gray-900">
                  {deleteTarget.name}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteTarget && deleteMutation.mutate(deleteTarget.id)
                }
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
