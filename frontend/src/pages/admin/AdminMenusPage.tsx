import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Bars3BottomLeftIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { adminMenusApi } from '@/api/admin.api';

// --- Types ---

interface MenuItem {
  id: number;
  menu_id: number;
  parent_id: number | null;
  title: string;
  url: string;
  link_type: string;
  open_in_new_tab: boolean;
  display_order: number;
  is_active: boolean;
  children: MenuItem[];
}

interface Menu {
  id: number;
  name: string;
  handle: string;
  is_active: boolean;
  item_count: number;
  created_at: string;
  updated_at: string;
}

interface MenuDetail {
  id: number;
  name: string;
  handle: string;
  is_active: boolean;
  items: MenuItem[];
  created_at: string;
  updated_at: string;
}

interface MenuFormData {
  name: string;
  handle: string;
  is_active: boolean;
}

interface ItemFormData {
  title: string;
  url: string;
  parent_id: number | null;
  link_type: string;
  open_in_new_tab: boolean;
  display_order: number;
  is_active: boolean;
}

const EMPTY_MENU_FORM: MenuFormData = { name: '', handle: '', is_active: true };
const EMPTY_ITEM_FORM: ItemFormData = {
  title: '',
  url: '',
  parent_id: null,
  link_type: 'custom',
  open_in_new_tab: false,
  display_order: 0,
  is_active: true,
};

const LINK_TYPES = [
  { value: 'custom', label: 'Custom URL' },
  { value: 'category', label: 'Category' },
  { value: 'collection', label: 'Collection' },
  { value: 'page', label: 'CMS Page' },
];

// --- Helpers ---

function flattenItems(items: MenuItem[], depth = 0): (MenuItem & { depth: number })[] {
  const result: (MenuItem & { depth: number })[] = [];
  for (const item of items) {
    result.push({ ...item, depth });
    if (item.children?.length > 0) {
      result.push(...flattenItems(item.children, depth + 1));
    }
  }
  return result;
}

// --- Component ---

export default function AdminMenusPage() {
  const queryClient = useQueryClient();

  // Menu list state
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [menuForm, setMenuForm] = useState<MenuFormData>(EMPTY_MENU_FORM);
  const [deletingMenuId, setDeletingMenuId] = useState<number | null>(null);

  // Menu detail (selected menu)
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);

  // Item modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>(EMPTY_ITEM_FORM);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  // --- Queries ---

  const { data: menusData, isLoading: menusLoading } = useQuery({
    queryKey: ['admin', 'menus'],
    queryFn: () => adminMenusApi.list(),
  });

  const menus: Menu[] = menusData?.data ?? [];

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'menus', selectedMenuId],
    queryFn: () => adminMenusApi.get(selectedMenuId!),
    enabled: !!selectedMenuId,
  });

  const menuDetail: MenuDetail | null = detailData?.data ?? null;

  // --- Menu mutations ---

  const createMenuMutation = useMutation({
    mutationFn: (data: MenuFormData) => adminMenusApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Menu created');
      queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      closeMenuModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to create menu'),
  });

  const updateMenuMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MenuFormData }) =>
      adminMenusApi.update(id, data as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Menu updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      closeMenuModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update menu'),
  });

  const deleteMenuMutation = useMutation({
    mutationFn: (id: number) => adminMenusApi.delete(id),
    onSuccess: () => {
      toast.success('Menu deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      if (selectedMenuId === deletingMenuId) setSelectedMenuId(null);
      setDeletingMenuId(null);
    },
    onError: () => toast.error('Failed to delete menu'),
  });

  // --- Item mutations ---

  const createItemMutation = useMutation({
    mutationFn: ({ menuId, data }: { menuId: number; data: ItemFormData }) =>
      adminMenusApi.createItem(menuId, data as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Item added');
      queryClient.invalidateQueries({ queryKey: ['admin', 'menus', selectedMenuId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      closeItemModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to add item'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ItemFormData }) =>
      adminMenusApi.updateItem(id, data as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Item updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'menus', selectedMenuId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      closeItemModal();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update item'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => adminMenusApi.deleteItem(id),
    onSuccess: () => {
      toast.success('Item deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'menus', selectedMenuId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'menus'] });
      setDeletingItemId(null);
    },
    onError: () => toast.error('Failed to delete item'),
  });

  // --- Menu modal handlers ---

  function openCreateMenu() {
    setEditingMenu(null);
    setMenuForm(EMPTY_MENU_FORM);
    setShowMenuModal(true);
  }

  function openEditMenu(menu: Menu) {
    setEditingMenu(menu);
    setMenuForm({ name: menu.name, handle: menu.handle, is_active: menu.is_active });
    setShowMenuModal(true);
  }

  function closeMenuModal() {
    setShowMenuModal(false);
    setEditingMenu(null);
    setMenuForm(EMPTY_MENU_FORM);
  }

  function handleMenuSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!menuForm.name.trim() || !menuForm.handle.trim()) {
      toast.error('Name and handle are required');
      return;
    }
    if (editingMenu) {
      updateMenuMutation.mutate({ id: editingMenu.id, data: { name: menuForm.name, handle: menuForm.handle, is_active: menuForm.is_active } });
    } else {
      createMenuMutation.mutate(menuForm);
    }
  }

  // --- Item modal handlers ---

  function openCreateItem() {
    setEditingItem(null);
    const nextOrder = menuDetail?.items ? flattenItems(menuDetail.items).length : 0;
    setItemForm({ ...EMPTY_ITEM_FORM, display_order: nextOrder });
    setShowItemModal(true);
  }

  function openEditItem(item: MenuItem) {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      url: item.url,
      parent_id: item.parent_id,
      link_type: item.link_type,
      open_in_new_tab: item.open_in_new_tab,
      display_order: item.display_order,
      is_active: item.is_active,
    });
    setShowItemModal(true);
  }

  function closeItemModal() {
    setShowItemModal(false);
    setEditingItem(null);
    setItemForm(EMPTY_ITEM_FORM);
  }

  function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.title.trim() || !itemForm.url.trim()) {
      toast.error('Title and URL are required');
      return;
    }
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: itemForm });
    } else {
      createItemMutation.mutate({ menuId: selectedMenuId!, data: itemForm });
    }
  }

  // --- Move item up/down ---

  function moveItem(item: MenuItem & { depth: number }, direction: 'up' | 'down') {
    if (!menuDetail) return;
    const flat = flattenItems(menuDetail.items);
    const siblings = flat.filter((i) => i.parent_id === item.parent_id);
    const idx = siblings.findIndex((s) => s.id === item.id);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= siblings.length - 1) return;

    const reordered = siblings.map((s, i) => ({ id: s.id, display_order: i }));
    // Swap
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [reordered[idx].display_order, reordered[swapIdx].display_order] = [
      reordered[swapIdx].display_order,
      reordered[idx].display_order,
    ];

    adminMenusApi.reorder(selectedMenuId!, reordered).then(() => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'menus', selectedMenuId] });
    });
  }

  const isSavingMenu = createMenuMutation.isPending || updateMenuMutation.isPending;
  const isSavingItem = createItemMutation.isPending || updateItemMutation.isPending;

  // Top-level items (for parent_id dropdown)
  const topLevelItems = menuDetail?.items?.filter((i) => !i.parent_id) ?? [];

  return (
    <>
      <Helmet>
        <title>Menus | Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Bars3BottomLeftIcon className="h-5 w-5 text-gray-500" />
              Navigation
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage store navigation menus</p>
          </div>
          <button
            onClick={openCreateMenu}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add menu
          </button>
        </div>

        <div className="flex gap-6">
          {/* Left: Menu list */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {menusLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                </div>
              ) : menus.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Bars3BottomLeftIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No menus yet</p>
                  <button onClick={openCreateMenu} className="mt-3 text-sm text-blue-600 hover:underline">
                    Create your first menu
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {menus.map((menu) => (
                    <div
                      key={menu.id}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors group ${
                        selectedMenuId === menu.id ? 'bg-gray-50' : 'hover:bg-gray-50/50'
                      }`}
                      onClick={() => setSelectedMenuId(menu.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{menu.name}</p>
                        <p className="text-xs text-gray-400">{menu.handle} &middot; {menu.item_count} items</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${menu.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditMenu(menu); }}
                          className="p-1 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit menu"
                        >
                          <PencilIcon className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                        {deletingMenuId === menu.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => deleteMenuMutation.mutate(menu.id)}
                              className="px-2 py-0.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeletingMenuId(null)}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingMenuId(menu.id); }}
                            className="p-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete menu"
                          >
                            <TrashIcon className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        )}
                        <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform ${selectedMenuId === menu.id ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Menu detail */}
          <div className="flex-1 min-w-0">
            {!selectedMenuId ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-20 px-4">
                <Bars3BottomLeftIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a menu to manage its items</p>
              </div>
            ) : detailLoading ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center py-20">
                <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              </div>
            ) : menuDetail ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Detail header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <div>
                    <h2 className="text-[15px] font-semibold text-gray-900">{menuDetail.name}</h2>
                    <p className="text-xs text-gray-400">Handle: {menuDetail.handle}</p>
                  </div>
                  <button
                    onClick={openCreateItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add item
                  </button>
                </div>

                {/* Items tree */}
                {menuDetail.items.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <p className="text-gray-500 text-sm">No items in this menu</p>
                    <button onClick={openCreateItem} className="mt-3 text-sm text-blue-600 hover:underline">
                      Add your first item
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {flattenItems(menuDetail.items).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50 transition-colors group"
                        style={{ paddingLeft: `${16 + item.depth * 24}px` }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {item.depth > 0 && (
                            <span className="text-gray-300 text-xs">&#x2514;</span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                            <p className="text-xs text-gray-400 truncate">{item.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {!item.is_active && (
                            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mr-1">
                              Draft
                            </span>
                          )}
                          {item.open_in_new_tab && (
                            <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded mr-1">
                              New tab
                            </span>
                          )}
                          <button
                            onClick={() => moveItem(item, 'up')}
                            className="p-1 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                            title="Move up"
                          >
                            <ArrowUpIcon className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => moveItem(item, 'down')}
                            className="p-1 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                            title="Move down"
                          >
                            <ArrowDownIcon className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => openEditItem(item)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit item"
                          >
                            <PencilIcon className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                          {deletingItemId === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteItemMutation.mutate(item.id)}
                                className="px-2 py-0.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeletingItemId(null)}
                                className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingItemId(item.id)}
                              className="p-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete item"
                            >
                              <TrashIcon className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {menuDetail.items.length > 0 && (
                  <div className="px-4 py-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      {flattenItems(menuDetail.items).length} item{flattenItems(menuDetail.items).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Create / Edit Menu Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeMenuModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">
                {editingMenu ? 'Edit menu' : 'Create menu'}
              </h2>
              <button onClick={closeMenuModal} className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMenuSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={menuForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setMenuForm({
                      ...menuForm,
                      name,
                      handle: editingMenu
                        ? menuForm.handle
                        : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                    });
                  }}
                  placeholder="e.g. Main Menu"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Handle</label>
                <input
                  type="text"
                  value={menuForm.handle}
                  onChange={(e) => setMenuForm({ ...menuForm, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="e.g. main-menu"
                  required
                  disabled={!!editingMenu}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Used to identify this menu in the storefront code</p>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="menu_active"
                  checked={menuForm.is_active}
                  onChange={(e) => setMenuForm({ ...menuForm, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <label htmlFor="menu_active" className="text-sm font-medium text-gray-700">Active</label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button type="button" onClick={closeMenuModal} className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingMenu} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {isSavingMenu ? 'Saving...' : editingMenu ? 'Save changes' : 'Create menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeItemModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">
                {editingItem ? 'Edit item' : 'Add item'}
              </h2>
              <button onClick={closeItemModal} className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleItemSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  type="text"
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="e.g. New Arrivals"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL</label>
                <input
                  type="text"
                  value={itemForm.url}
                  onChange={(e) => setItemForm({ ...itemForm, url: e.target.value })}
                  placeholder="e.g. /category/new-arrivals"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Link type</label>
                  <select
                    value={itemForm.link_type}
                    onChange={(e) => setItemForm({ ...itemForm, link_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                  >
                    {LINK_TYPES.map((lt) => (
                      <option key={lt.value} value={lt.value}>{lt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Parent item</label>
                  <select
                    value={itemForm.parent_id ?? ''}
                    onChange={(e) => setItemForm({ ...itemForm, parent_id: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                  >
                    <option value="">None (top level)</option>
                    {topLevelItems
                      .filter((i) => i.id !== editingItem?.id)
                      .map((i) => (
                        <option key={i.id} value={i.id}>{i.title}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Display order</label>
                  <input
                    type="number"
                    value={itemForm.display_order}
                    onChange={(e) => setItemForm({ ...itemForm, display_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={itemForm.open_in_new_tab}
                        onChange={(e) => setItemForm({ ...itemForm, open_in_new_tab: e.target.checked })}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <span className="text-sm text-gray-700">Open in new tab</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={itemForm.is_active}
                        onChange={(e) => setItemForm({ ...itemForm, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button type="button" onClick={closeItemModal} className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingItem} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {isSavingItem ? 'Saving...' : editingItem ? 'Save changes' : 'Add item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
