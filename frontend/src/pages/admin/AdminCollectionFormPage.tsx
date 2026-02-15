import { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PhotoIcon,
  TrashIcon,
  ChevronUpDownIcon,
  ArrowUpTrayIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline';
import {
  adminCollectionsApi,
  adminProductsApi,
  adminMediaApi,
} from '@/api/admin.api';

// --- Types ---

interface CollectionProduct {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  base_price: number;
  status: string;
}

interface CollectionDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  type: string;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  meta_title: string | null;
  meta_description: string | null;
  product_count: number;
  products: CollectionProduct[];
}

interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  primary_image?: string | null;
  base_price: number;
  status: string;
}

// --- Component ---

export default function AdminCollectionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [collectionType, setCollectionType] = useState<'manual' | 'automated'>('manual');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Products in collection
  const [collectionProducts, setCollectionProducts] = useState<CollectionProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showBrowse, setShowBrowse] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [productSort, setProductSort] = useState('best_selling');

  // Delete confirmation
  const [showDelete, setShowDelete] = useState(false);

  // Image upload
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminMediaApi.upload(formData);
      setImageUrl(res.data.url);
      toast.success('Image uploaded');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  // --- Load existing collection ---
  const { data: collectionData, isLoading } = useQuery({
    queryKey: ['admin', 'collection', id],
    queryFn: () => adminCollectionsApi.get(Number(id)).then((r) => r.data as CollectionDetail),
    enabled: isEdit,
  });

  useEffect(() => {
    if (collectionData) {
      setName(collectionData.name);
      setDescription(collectionData.description || '');
      setImageUrl(collectionData.image_url || '');
      setCollectionType(collectionData.type as 'manual' | 'automated');
      setIsActive(collectionData.is_active);
      setIsFeatured(collectionData.is_featured);
      setMetaTitle(collectionData.meta_title || '');
      setMetaDescription(collectionData.meta_description || '');
      setCollectionProducts(collectionData.products || []);
    }
  }, [collectionData]);

  // --- Browse products ---
  const { data: browseData } = useQuery({
    queryKey: ['admin', 'products', 'browse', browseSearch],
    queryFn: () =>
      adminProductsApi.list({ q: browseSearch || undefined, page_size: 20 }).then((r) => r.data),
    enabled: showBrowse,
  });

  const browseProducts: ProductListItem[] = (() => {
    const raw = browseData?.items ?? browseData?.results ?? (Array.isArray(browseData) ? browseData : []);
    // Filter out products already in collection
    const existingIds = new Set(collectionProducts.map((p) => p.id));
    return raw.filter((p: ProductListItem) => !existingIds.has(p.id));
  })();

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await adminCollectionsApi.create(payload);
      return res.data;
    },
    onSuccess: async (data: { id: number }) => {
      // Add products to the new collection
      if (collectionProducts.length > 0) {
        await adminCollectionsApi.addProducts(
          data.id,
          collectionProducts.map((p) => p.id),
        );
      }
      toast.success('Collection created');
      queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
      navigate('/admin/collections');
    },
    onError: () => toast.error('Failed to create collection'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      adminCollectionsApi.update(Number(id), payload),
    onSuccess: () => {
      toast.success('Collection updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'collection', id] });
      navigate('/admin/collections');
    },
    onError: () => toast.error('Failed to update collection'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminCollectionsApi.delete(Number(id)),
    onSuccess: () => {
      toast.success('Collection deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
      navigate('/admin/collections');
    },
    onError: () => toast.error('Failed to delete collection'),
  });

  const addProductMutation = useMutation({
    mutationFn: (productIds: number[]) =>
      adminCollectionsApi.addProducts(Number(id), productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'collection', id] });
    },
  });

  const removeProductMutation = useMutation({
    mutationFn: (productId: number) =>
      adminCollectionsApi.removeProduct(Number(id), productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'collection', id] });
    },
  });

  // --- Handlers ---

  function handleSave() {
    if (!name.trim()) {
      toast.error('Title is required');
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      type: collectionType,
      is_active: isActive,
      is_featured: isFeatured,
      meta_title: metaTitle.trim() || undefined,
      meta_description: metaDescription.trim() || undefined,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  function addProduct(product: ProductListItem) {
    const newProduct: CollectionProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      image_url: product.primary_image || null,
      base_price: product.base_price,
      status: product.status,
    };
    setCollectionProducts((prev) => [...prev, newProduct]);

    // If editing, also add to backend
    if (isEdit) {
      addProductMutation.mutate([product.id]);
    }
    setShowBrowse(false);
    setBrowseSearch('');
  }

  function removeProduct(productId: number) {
    setCollectionProducts((prev) => prev.filter((p) => p.id !== productId));
    if (isEdit) {
      removeProductMutation.mutate(productId);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Filter and sort products
  const displayProducts = (() => {
    let filtered = productSearch.trim()
      ? collectionProducts.filter((p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()),
        )
      : [...collectionProducts];

    // Apply sort
    switch (productSort) {
      case 'name_asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price_asc':
        filtered.sort((a, b) => a.base_price - b.base_price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.base_price - a.base_price);
        break;
      default:
        break;
    }
    return filtered;
  })();

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {isEdit ? `Edit ${name || 'Collection'}` : 'Add collection'} | Admin
        </title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/collections')}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <RectangleGroupIcon className="h-5 w-5 text-gray-500" />
            {isEdit ? name || 'Edit collection' : 'Add collection'}
          </h1>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title & Description card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Summer collection, Under $100, Staff picks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for this collection..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-y"
                />
              </div>
            </div>

            {/* Collection type card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Collection type
              </p>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="collection_type"
                    checked={collectionType === 'manual'}
                    onChange={() => setCollectionType('manual')}
                    className="mt-0.5 h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Manual</p>
                    <p className="text-sm text-gray-500">
                      Add products to this collection one by one.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="collection_type"
                    checked={collectionType === 'automated'}
                    onChange={() => setCollectionType('automated')}
                    className="mt-0.5 h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Smart</p>
                    <p className="text-sm text-gray-500">
                      Existing and future products that match the conditions you
                      set will automatically be added to this collection.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Products card (manual only) */}
            {collectionType === 'manual' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 pb-0">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Products
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search products"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                    <button
                      onClick={() => setShowBrowse(true)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      Browse
                    </button>
                    <div className="relative">
                      <select
                        value={productSort}
                        onChange={(e) => setProductSort(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                      >
                        <option value="best_selling">
                          Sort: Best selling
                        </option>
                        <option value="name_asc">Sort: A-Z</option>
                        <option value="name_desc">Sort: Z-A</option>
                        <option value="price_asc">
                          Sort: Price low-high
                        </option>
                        <option value="price_desc">
                          Sort: Price high-low
                        </option>
                      </select>
                      <ChevronUpDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Product list */}
                {displayProducts.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-gray-500">
                      {collectionProducts.length === 0
                        ? 'No products in this collection yet. Browse to add products.'
                        : 'No products matching your search.'}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3">
                    {displayProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 hover:bg-gray-50/50 transition-colors group"
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded border border-gray-200 object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <PhotoIcon className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">
                          Rs {product.base_price.toLocaleString()}
                        </span>
                        <button
                          onClick={() => removeProduct(product.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove"
                        >
                          <XMarkIcon className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {collectionProducts.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {collectionProducts.length} product
                      {collectionProducts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SEO card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Search engine listing
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Meta title
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={name || 'Collection title'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Meta description
                  </label>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Brief description for search engines..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-y"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right column (1/3) */}
          <div className="space-y-4">
            {/* Publishing card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Publishing
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="col_active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <label
                    htmlFor="col_active"
                    className="text-sm font-medium text-gray-700"
                  >
                    Active
                  </label>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="col_featured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <label
                    htmlFor="col_featured"
                    className="text-sm font-medium text-gray-700"
                  >
                    Featured
                  </label>
                </div>
              </div>
            </div>

            {/* Image card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">Image</p>
              {imageUrl ? (
                <div className="space-y-3">
                  <div className="relative group">
                    <img
                      src={imageUrl}
                      alt="Collection"
                      className="w-full rounded-lg border border-gray-200 object-cover max-h-48"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white text-gray-900 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Change
                      </button>
                      <button
                        onClick={() => setImageUrl('')}
                        className="p-1.5 bg-white rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-gray-400 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  {uploading ? (
                    <>
                      <div className="h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <ArrowUpTrayIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">
                        Add image
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        or drop an image to upload
                      </p>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {isEdit && (
              <button
                onClick={() => setShowDelete(true)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Delete collection
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/collections')}
              className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Save' : 'Save collection'}
            </button>
          </div>
        </div>
      </div>

      {/* Browse products modal */}
      {showBrowse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => {
              setShowBrowse(false);
              setBrowseSearch('');
            }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">
                Add products
              </h2>
              <button
                onClick={() => {
                  setShowBrowse(false);
                  setBrowseSearch('');
                }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {browseProducts.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-500">No products found</p>
                </div>
              ) : (
                browseProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className="w-full flex items-center gap-3 px-5 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
                  >
                    {product.primary_image ? (
                      <img
                        src={product.primary_image}
                        alt={product.name}
                        className="w-10 h-10 rounded border border-gray-200 object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <PhotoIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Rs {product.base_price.toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          product.status === 'active'
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}
                      />
                      {product.status === 'active' ? 'Active' : product.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowDelete(false)}
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
                <span className="font-semibold text-gray-900">{name}</span>?
                This will not delete the products in it.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
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
