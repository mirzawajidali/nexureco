import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid';
import { CubeIcon } from '@heroicons/react/24/outline';
import { adminInventoryApi } from '@/api/admin.api';
import Spinner from '@/components/ui/Spinner';

interface InventoryItem {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_title: string | null;
  primary_image: string | null;
  sku: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  unavailable: number;
  committed: number;
}

interface PaginatedInventory {
  items: InventoryItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const REASON_OPTIONS = [
  { value: 'recount', label: 'Recount' },
  { value: 'received', label: 'Received' },
  { value: 'return', label: 'Return' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'other', label: 'Other' },
];

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ variantId: number; field: 'available' | 'on_hand' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Adjust modal state
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustForm, setAdjustForm] = useState({ quantity_change: 0, reason: 'recount', note: '' });

  const pageSize = 50;

  const { data, isLoading } = useQuery<{ data: PaginatedInventory }>({
    queryKey: ['admin-inventory', page, searchQuery],
    queryFn: () => adminInventoryApi.list({ page, page_size: pageSize, q: searchQuery || undefined }),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ variantId, payload }: { variantId: number; payload: { quantity_change: number; reason: string; note?: string } }) =>
      adminInventoryApi.adjust(variantId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: () => {
      toast.error('Failed to adjust stock');
    },
  });

  const inventory = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.total_pages ?? 1;

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(search);
    setPage(1);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === inventory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(inventory.map((i) => i.variant_id)));
    }
  }

  function startEdit(item: InventoryItem, field: 'available' | 'on_hand') {
    const currentValue = field === 'available' ? item.stock_quantity : item.stock_quantity;
    setEditingCell({ variantId: item.variant_id, field });
    setEditValue(String(currentValue));
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit(item: InventoryItem) {
    if (!editingCell) return;
    const newVal = parseInt(editValue, 10);
    if (isNaN(newVal) || newVal < 0) {
      setEditingCell(null);
      return;
    }

    const diff = newVal - item.stock_quantity;
    if (diff !== 0) {
      adjustMutation.mutate({
        variantId: item.variant_id,
        payload: { quantity_change: diff, reason: 'recount' },
      });
    }
    setEditingCell(null);
  }

  function handleEditKeyDown(e: React.KeyboardEvent, item: InventoryItem) {
    if (e.key === 'Enter') {
      commitEdit(item);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  }

  function openAdjustModal(item: InventoryItem) {
    setAdjustItem(item);
    setAdjustForm({ quantity_change: 0, reason: 'recount', note: '' });
  }

  function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustItem || adjustForm.quantity_change === 0) return;
    adjustMutation.mutate(
      {
        variantId: adjustItem.variant_id,
        payload: {
          quantity_change: adjustForm.quantity_change,
          reason: adjustForm.reason,
          note: adjustForm.note || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Stock adjusted');
          setAdjustItem(null);
        },
      }
    );
  }

  return (
    <>
      <Helmet>
        <title>Inventory | Admin | My Brand</title>
      </Helmet>

      <div className="space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <CubeIcon className="h-5 w-5 text-gray-500" />
              Inventory
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Track and manage stock levels</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Export
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Import
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Tabs + Search bar */}
          <div className="border-b border-gray-200">
            <div className="flex items-center justify-between px-4 pt-3">
              <div className="flex items-center gap-0">
                <button className="px-3 py-2 text-sm font-medium text-gray-900 border-b-2 border-gray-900 -mb-px">
                  All
                </button>
                <button className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 -mb-px">
                  + View
                </button>
              </div>
            </div>
            {/* Search row */}
            <div className="px-4 py-3 flex items-center gap-2">
              <form onSubmit={handleSearch} className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search inventory"
                  className="w-full pl-9 pr-3 py-[7px] text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder:text-gray-400"
                />
              </form>
              <button className="p-[7px] border border-gray-300 rounded-lg hover:bg-gray-50">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <button className="p-[7px] border border-gray-300 rounded-lg hover:bg-gray-50">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h12M3 17h6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : inventory.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-500">No inventory items found</p>
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
                          checked={selectedIds.size === inventory.length && inventory.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">
                        Product
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">
                        SKU
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">
                        Unavailable
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">
                        Committed
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">
                        Available
                      </th>
                      <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">
                        On hand
                      </th>
                      <th className="w-10 px-3 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.map((item) => {
                      const isEditing = editingCell?.variantId === item.variant_id;
                      return (
                        <tr key={item.variant_id} className="hover:bg-gray-50/50 transition-colors">
                          {/* Checkbox */}
                          <td className="px-4 py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.variant_id)}
                              onChange={() => toggleSelect(item.variant_id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>

                          {/* Product */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0">
                                {item.primary_image ? (
                                  <img
                                    src={item.primary_image}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.product_name}
                                </p>
                                {item.variant_title && (
                                  <p className="text-xs text-gray-500 mt-0.5">{item.variant_title}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="px-3 py-2.5 text-gray-500 text-sm">
                            {item.sku || '—'}
                          </td>

                          {/* Unavailable */}
                          <td className="px-3 py-2.5 text-right text-sm text-gray-500">
                            {item.unavailable}
                          </td>

                          {/* Committed */}
                          <td className="px-3 py-2.5 text-right text-sm text-gray-500">
                            {item.committed}
                          </td>

                          {/* Available (editable) */}
                          <td className="px-3 py-2.5 text-right">
                            {isEditing && editingCell.field === 'available' ? (
                              <input
                                ref={inputRef}
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitEdit(item)}
                                onKeyDown={(e) => handleEditKeyDown(e, item)}
                                className="w-20 ml-auto text-right text-sm border border-blue-400 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                min={0}
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(item, 'available')}
                                className="inline-block w-20 text-right text-sm text-gray-700 border border-transparent hover:border-gray-300 rounded-md px-2 py-1 transition-colors cursor-text"
                              >
                                {item.stock_quantity}
                              </button>
                            )}
                          </td>

                          {/* On hand (editable) */}
                          <td className="px-3 py-2.5 text-right">
                            {isEditing && editingCell.field === 'on_hand' ? (
                              <input
                                ref={inputRef}
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitEdit(item)}
                                onKeyDown={(e) => handleEditKeyDown(e, item)}
                                className="w-20 ml-auto text-right text-sm border border-blue-400 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                min={0}
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => startEdit(item, 'on_hand')}
                                className="inline-block w-20 text-right text-sm text-gray-700 border border-transparent hover:border-gray-300 rounded-md px-2 py-1 transition-colors cursor-text"
                              >
                                {item.stock_quantity}
                              </button>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => openAdjustModal(item)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Adjust stock"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                              </svg>
                            </button>
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <span className="text-sm text-gray-700 min-w-[80px] text-center">
                    {rangeStart}–{rangeEnd} of {total}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Adjust Stock Modal */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setAdjustItem(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Adjust stock</h2>

            {/* Product info */}
            <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-lg">
              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white overflow-hidden flex-shrink-0">
                {adjustItem.primary_image ? (
                  <img src={adjustItem.primary_image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{adjustItem.product_name}</p>
                {adjustItem.variant_title && (
                  <p className="text-xs text-gray-500">{adjustItem.variant_title}</p>
                )}
                {adjustItem.sku && (
                  <p className="text-xs text-gray-400 mt-0.5">SKU: {adjustItem.sku}</p>
                )}
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Quantity change
                </label>
                <input
                  type="number"
                  value={adjustForm.quantity_change}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, quantity_change: parseInt(e.target.value, 10) || 0 }))}
                  placeholder="e.g. 10 or -5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                {adjustForm.quantity_change !== 0 && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    New stock: <span className="font-semibold">{adjustItem.stock_quantity + adjustForm.quantity_change}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
                <select
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
                >
                  {REASON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Note (optional)</label>
                <textarea
                  value={adjustForm.note}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Additional details..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 resize-y"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustForm.quantity_change === 0 || adjustMutation.isPending}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-[#1a1a1a] rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {adjustMutation.isPending ? 'Saving...' : 'Adjust'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
