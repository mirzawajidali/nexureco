import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useWatch, UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeftIcon,
  XMarkIcon,
  StarIcon,
  ArrowUpTrayIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { adminProductsApi, adminCategoriesApi } from '@/api/admin.api';
import { APP_NAME } from '@/utils/constants';
import type { Product, ProductImage, Category } from '@/types/product';
import Spinner from '@/components/ui/Spinner';
import RichTextEditor from '@/components/admin/RichTextEditor';
import VariantManager from '@/components/admin/VariantManager';
import type { VariantFormData } from '@/components/admin/VariantManager';

// --- Zod schema ---

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional().default(''),
  short_description: z.string().optional().default(''),
  base_price: z
    .number({ invalid_type_error: 'Price is required' })
    .min(0, 'Price must be 0 or more'),
  compare_at_price: z
    .union([z.number().min(0), z.nan(), z.null()])
    .optional()
    .transform((v) => (v !== null && v !== undefined && !Number.isNaN(v) ? v : null)),
  cost_price: z
    .union([z.number().min(0), z.nan(), z.null()])
    .optional()
    .transform((v) => (v !== null && v !== undefined && !Number.isNaN(v) ? v : null)),
  sku: z.string().optional().default(''),
  barcode: z.string().optional().default(''),
  weight: z
    .union([z.number().min(0), z.nan(), z.null()])
    .optional()
    .transform((v) => (v !== null && v !== undefined && !Number.isNaN(v) ? v : null)),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
  is_featured: z.boolean().default(false),
  category_id: z
    .union([z.number().int().positive(), z.nan(), z.null()])
    .optional()
    .transform((v) => (v !== null && v !== undefined && !Number.isNaN(v) ? v : null)),
  tags: z.string().optional().default(''),
  meta_title: z.string().optional().default(''),
  meta_description: z.string().optional().default(''),
});

type ProductFormData = z.infer<typeof productSchema>;

// --- Status helpers ---

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

// --- Card wrapper ---

function Card({
  title,
  titleRight,
  children,
  className,
}: {
  title?: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('bg-white border border-gray-200 rounded-xl p-5', className)}>
      {(title || titleRight) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
          {titleRight}
        </div>
      )}
      {children}
    </div>
  );
}

// --- Input with prefix/suffix ---

function PriceInput({
  registration,
  placeholder = '0.00',
  error,
}: {
  registration: UseFormRegisterReturn;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rs</span>
        <input
          type="number"
          step="1"
          min="0"
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
          {...registration}
        />
      </div>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

// --- Component ---

export default function AdminProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id && id !== 'new';
  const productId = isEditing ? Number(id) : null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [descriptionHtml, setDescriptionHtml] = useState('');
  // Pending files for new products (queued before save)
  const [pendingFiles, setPendingFiles] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [variantData, setVariantData] = useState<VariantFormData>({
    hasVariants: false,
    options: [],
    variants: [],
  });
  const handleVariantChange = useCallback((data: VariantFormData) => {
    setVariantData(data);
  }, []);

  // Collapsible sections
  const [showPriceExtras, setShowPriceExtras] = useState(false);
  const [showSkuBarcode, setShowSkuBarcode] = useState(false);
  const [isPhysicalProduct, setIsPhysicalProduct] = useState(true);
  const [seoExpanded, setSeoExpanded] = useState(false);

  // Stock for simple (non-variant) products
  const [simpleStockQty, setSimpleStockQty] = useState(0);

  // Tags as chips
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Rich content sections (Adidas-style accordion data)
  const [sizeAndFit, setSizeAndFit] = useState<{
    fit_type: string;
    model_info: string;
    details: string[];
  }>({ fit_type: '', model_info: '', details: [] });
  const [sizeFitDetailInput, setSizeFitDetailInput] = useState('');

  const [careInstructions, setCareInstructions] = useState<{
    washing: { icon?: string; text: string }[];
    extra_care: string[];
  }>({ washing: [], extra_care: [] });
  const [careWashInput, setCareWashInput] = useState({ icon: '', text: '' });
  const [careExtraInput, setCareExtraInput] = useState('');

  const [materialInfo, setMaterialInfo] = useState<{
    composition: string;
    features: string[];
  }>({ composition: '', features: [] });
  const [materialFeatureInput, setMaterialFeatureInput] = useState('');

  const [showContentSections, setShowContentSections] = useState(false);

  // --- Queries ---

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['admin', 'product', productId],
    queryFn: async () => {
      const res = await adminProductsApi.get(productId!);
      return res.data as Product;
    },
    enabled: isEditing,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const res = await adminCategoriesApi.list();
      return (res.data?.items ?? res.data) as Category[];
    },
  });

  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // --- Form ---

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      short_description: '',
      base_price: 0,
      compare_at_price: null,
      cost_price: null,
      sku: '',
      barcode: '',
      weight: null,
      status: 'draft',
      is_featured: false,
      category_id: null,
      tags: '',
      meta_title: '',
      meta_description: '',
    },
  });

  const watchedName = useWatch({ control, name: 'name' });
  const watchedMetaTitle = useWatch({ control, name: 'meta_title' });
  const watchedMetaDesc = useWatch({ control, name: 'meta_description' });
  const watchedBasePrice = useWatch({ control, name: 'base_price' });

  // Prefill form when editing
  useEffect(() => {
    if (product) {
      reset({
        name: product.name ?? '',
        description: product.description ?? '',
        short_description: product.short_description ?? '',
        base_price: product.base_price,
        compare_at_price: product.compare_at_price,
        cost_price: product.cost_price,
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        weight: product.weight,
        status: product.status,
        is_featured: product.is_featured,
        category_id: product.category_id,
        tags: product.tags?.join(', ') ?? '',
        meta_title: product.meta_title ?? '',
        meta_description: product.meta_description ?? '',
      });
      setDescriptionHtml(product.description ?? '');
      setTags(product.tags ?? []);
      // Expand collapsible sections if data exists
      if (product.compare_at_price || product.cost_price) setShowPriceExtras(true);
      if (product.sku || product.barcode) setShowSkuBarcode(true);
      if (product.meta_title || product.meta_description) setSeoExpanded(true);
      setIsPhysicalProduct(product.requires_shipping !== false);
      // Prefill rich content sections
      if (product.size_and_fit) {
        setSizeAndFit({
          fit_type: product.size_and_fit.fit_type ?? '',
          model_info: product.size_and_fit.model_info ?? '',
          details: product.size_and_fit.details ?? [],
        });
        setShowContentSections(true);
      }
      if (product.care_instructions) {
        setCareInstructions({
          washing: product.care_instructions.washing ?? [],
          extra_care: product.care_instructions.extra_care ?? [],
        });
        setShowContentSections(true);
      }
      if (product.material_info) {
        setMaterialInfo({
          composition: product.material_info.composition ?? '',
          features: product.material_info.features ?? [],
        });
        setShowContentSections(true);
      }
      // If product has a default variant (no options), load its stock qty
      if (product.options.length === 0 && product.variants.length > 0) {
        setSimpleStockQty(product.variants[0].stock_quantity);
      }
    }
  }, [product, reset]);

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await adminProductsApi.create(data);
      const newId = res.data?.id;
      // Upload pending files after product creation
      if (newId && pendingFiles.length > 0) {
        for (const pf of pendingFiles) {
          const formData = new FormData();
          formData.append('file', pf.file);
          try {
            await adminProductsApi.uploadImage(newId, formData);
          } catch {
            // Continue uploading remaining files
          }
        }
        // Clean up preview URLs
        pendingFiles.forEach((pf) => URL.revokeObjectURL(pf.preview));
        setPendingFiles([]);
      }
      return res;
    },
    onSuccess: (res) => {
      toast.success('Product created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const newId = res.data?.id;
      if (newId) {
        navigate(`/admin/products/${newId}`, { replace: true });
      } else {
        navigate('/admin/products');
      }
    },
    onError: () => toast.error('Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      adminProductsApi.update(productId!, data),
    onSuccess: () => {
      toast.success('Product updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      // Also invalidate storefront product queries so changes show immediately
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Failed to update product'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await adminProductsApi.uploadImage(productId!, formData);
        results.push(res.data);
      }
      return results;
    },
    onSuccess: () => {
      toast.success('Image(s) uploaded');
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
    onError: () => toast.error('Failed to upload image'),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId: number) =>
      adminProductsApi.setPrimaryImage(productId!, imageId),
    onSuccess: () => {
      toast.success('Primary image updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Failed to set primary image'),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) =>
      adminProductsApi.deleteImage(productId!, imageId),
    onSuccess: () => {
      toast.success('Image deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: () => toast.error('Failed to delete image'),
  });

  const reorderMutation = useMutation({
    mutationFn: (imageIds: number[]) =>
      adminProductsApi.reorderImages(productId!, imageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
    },
  });

  const [dragImageId, setDragImageId] = useState<number | null>(null);

  // --- Handlers ---

  const onSubmit = (formData: ProductFormData) => {
    const payload: Record<string, unknown> = {
      name: formData.name,
      description: descriptionHtml || formData.description || null,
      short_description: formData.short_description || null,
      base_price: formData.base_price,
      compare_at_price: formData.compare_at_price,
      cost_price: formData.cost_price,
      sku: formData.sku || null,
      barcode: formData.barcode || null,
      weight: isPhysicalProduct ? formData.weight : null,
      requires_shipping: isPhysicalProduct,
      status: formData.status,
      is_featured: formData.is_featured,
      category_id: formData.category_id,
      tags: tags,
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
      size_and_fit:
        sizeAndFit.fit_type || sizeAndFit.model_info || sizeAndFit.details.length > 0
          ? sizeAndFit
          : null,
      care_instructions:
        careInstructions.washing.length > 0 || careInstructions.extra_care.length > 0
          ? careInstructions
          : null,
      material_info:
        materialInfo.composition || materialInfo.features.length > 0
          ? materialInfo
          : null,
    };

    // Add variant data
    if (variantData.hasVariants && variantData.options.length > 0) {
      payload.options = variantData.options
        .filter((o) => o.name.trim() && o.values.length > 0)
        .map((opt) => ({
          name: opt.name,
          values: opt.values.filter((v) => v.trim()).map((v) => ({ value: v })),
        }));

      const flatValues: { optionIdx: number; value: string }[] = [];
      (payload.options as { name: string; values: { value: string }[] }[]).forEach(
        (opt, optIdx) => {
          opt.values.forEach((val) => {
            flatValues.push({ optionIdx: optIdx, value: val.value });
          });
        },
      );

      payload.variants = variantData.variants.map((v) => ({
        sku: v.sku || null,
        price: v.price,
        compare_at_price: null,
        cost_price: null,
        stock_quantity: v.stockQuantity,
        low_stock_threshold: 5,
        option_value_indices: v.optionValueCombo.map((comboValue, comboIdx) =>
          flatValues.findIndex(
            (fv) => fv.optionIdx === comboIdx && fv.value === comboValue,
          ),
        ),
        image_url: v.imageUrl || null,
      }));
    } else {
      payload.options = [];
      // Create a default variant for stock tracking
      payload.variants = [
        {
          sku: formData.sku || null,
          price: null,
          compare_at_price: null,
          cost_price: null,
          stock_quantity: simpleStockQty,
          low_stock_threshold: 5,
          option_value_indices: [],
          image_url: null,
        },
      ];
    }

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const validFiles: File[] = [];
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowed.includes(ext)) {
        toast.error(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: exceeds 5MB limit`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;

    if (isEditing) {
      uploadMutation.mutate(validFiles);
    } else {
      // Queue files for upload after product creation
      const newPending = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }));
      setPendingFiles((prev) => [...prev, ...newPending]);
    }
  }

  function removePendingFile(fileId: string) {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== fileId);
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const images: ProductImage[] = [...(product?.images ?? [])].sort(
    (a, b) => a.display_order - b.display_order
  );

  function handleImageDragStart(imageId: number) {
    setDragImageId(imageId);
  }

  function handleImageDragOver(e: React.DragEvent, targetId: number) {
    e.preventDefault();
    if (dragImageId === null || dragImageId === targetId) return;
    e.dataTransfer.dropEffect = 'move';
  }

  function handleImageDrop(targetId: number) {
    if (dragImageId === null || dragImageId === targetId) {
      setDragImageId(null);
      return;
    }
    const fromIdx = images.findIndex((img) => img.id === dragImageId);
    const toIdx = images.findIndex((img) => img.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { setDragImageId(null); return; }

    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const newIds = reordered.map((img) => img.id);

    // If the primary image changed position (first image became different), update primary too
    const newFirst = reordered[0];
    const wasPrimary = images.find((img) => img.is_primary);
    if (newFirst && wasPrimary && newFirst.id !== wasPrimary.id) {
      setPrimaryMutation.mutate(newFirst.id);
    }

    reorderMutation.mutate(newIds);
    setDragImageId(null);
  }

  // --- Loading ---

  if (isEditing && productLoading) {
    return (
      <>
        <Helmet>
          <title>Edit Product | {APP_NAME} Admin</title>
        </Helmet>
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
        </div>
      </>
    );
  }

  // --- Render ---

  return (
    <>
      <Helmet>
        <title>
          {isEditing ? `Edit: ${product?.name ?? 'Product'}` : 'Add product'} | {APP_NAME} Admin
        </title>
      </Helmet>

      {/* Header: breadcrumb + actions */}
      <div className="max-w-[980px] mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingBagIcon className="h-5 w-5 text-gray-500" />
            {isEditing ? product?.name ?? 'Edit product' : 'Add product'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-[980px] mx-auto">
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ===== LEFT COLUMN (2/3) ===== */}
          <div className="lg:col-span-2 space-y-5">
            {/* Title & Description */}
            <Card>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Short sleeve t-shirt"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description
                  </label>
                  <RichTextEditor
                    content={descriptionHtml}
                    onChange={setDescriptionHtml}
                    placeholder="Write a description..."
                  />
                </div>
              </div>
            </Card>

            {/* Media */}
            <Card title="Media">
              {!isEditing ? (
                pendingFiles.length === 0 ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={clsx(
                      'border border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                      isDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-300 bg-gray-50/50 hover:border-gray-400',
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex items-center justify-center gap-4">
                      <span className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white">
                        Upload new
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      Accepts images up to 5MB each
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
                      multiple
                      className="hidden"
                      onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ''; }}
                    />
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <div className="grid grid-cols-4 gap-2">
                      {/* First pending image (large, 2x2) */}
                      <div className="col-span-2 row-span-2 relative group aspect-square bg-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={pendingFiles[0].preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => removePendingFile(pendingFiles[0].id)}
                            className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                            title="Remove"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Other pending images */}
                      {pendingFiles.slice(1).map((pf) => (
                        <div
                          key={pf.id}
                          className="relative group aspect-square bg-gray-100 border border-gray-200 rounded-lg overflow-hidden"
                        >
                          <img src={pf.preview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => removePendingFile(pf.id)}
                              className="p-1.5 bg-white rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                              title="Remove"
                            >
                              <XMarkIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add more */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={clsx(
                          'aspect-square border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors',
                          isDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-300 hover:border-gray-400',
                        )}
                      >
                        <ArrowUpTrayIcon className="h-5 w-5 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-400 font-medium">Add</span>
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
                      multiple
                      className="hidden"
                      onChange={(e) => { handleFileSelect(e.target.files); e.target.value = ''; }}
                    />
                  </div>
                )
              ) : images.length === 0 ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={clsx(
                    'border border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    isDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-300 bg-gray-50/50 hover:border-gray-400',
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadMutation.isPending ? (
                    <div className="flex flex-col items-center gap-2">
                      <Spinner />
                      <p className="text-sm text-gray-500">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-4">
                        <span className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white">
                          Upload new
                        </span>
                        <span className="text-sm text-gray-500">Select existing</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        Accepts images, videos, or 3D models
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!dragImageId) setIsDragging(true);
                  }}
                  onDragLeave={() => { if (!dragImageId) setIsDragging(false); }}
                  onDrop={(e) => { if (!dragImageId) handleDrop(e); }}
                >
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img, idx) => {
                      const isFirst = idx === 0;
                      const isPrimary = img.is_primary;
                      return (
                        <div
                          key={img.id}
                          draggable
                          onDragStart={() => handleImageDragStart(img.id)}
                          onDragOver={(e) => handleImageDragOver(e, img.id)}
                          onDrop={() => handleImageDrop(img.id)}
                          onDragEnd={() => setDragImageId(null)}
                          className={clsx(
                            'relative group aspect-square bg-gray-100 border rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all',
                            isFirst && 'col-span-2 row-span-2',
                            dragImageId === img.id ? 'opacity-40 border-gray-400 scale-95' : 'border-gray-200',
                            dragImageId && dragImageId !== img.id && 'ring-0 hover:ring-2 hover:ring-blue-400',
                          )}
                        >
                          <img
                            src={img.url}
                            alt={img.alt_text ?? 'Product image'}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                          {/* Primary badge */}
                          {isPrimary && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-bold uppercase tracking-wider rounded">
                              Primary
                            </span>
                          )}
                          {/* Hover actions */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setPrimaryMutation.mutate(img.id); }}
                                className="p-1.5 bg-white rounded-lg text-gray-800 hover:bg-yellow-50 transition-colors shadow-sm"
                                title="Set as primary"
                              >
                                <StarIcon className={isFirst ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); deleteImageMutation.mutate(img.id); }}
                              className="p-1.5 bg-white rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                              title="Delete"
                            >
                              <XMarkIcon className={isFirst ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add more */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={clsx(
                        'aspect-square border border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors',
                        isDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-300 hover:border-gray-400',
                      )}
                    >
                      {uploadMutation.isPending ? (
                        <Spinner />
                      ) : (
                        <>
                          <ArrowUpTrayIcon className="h-5 w-5 text-gray-400 mb-1" />
                          <span className="text-[10px] text-gray-400 font-medium">Add</span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 mt-2">Drag images to reorder</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFileSelect(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}
            </Card>

            {/* Category */}
            <Card title="Category">
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                {...register('category_id', { valueAsNumber: true })}
              >
                <option value="">Choose a product category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-2">
                Determines tax rates and adds metafields to improve search, filters, and cross-channel sales
              </p>
            </Card>

            {/* Pricing */}
            <Card title="Pricing">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Price</label>
                    <PriceInput
                      registration={register('base_price', { valueAsNumber: true })}
                      error={errors.base_price?.message}
                    />
                  </div>
                  {showPriceExtras && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Compare-at price</label>
                      <PriceInput
                        registration={register('compare_at_price', { valueAsNumber: true })}
                      />
                    </div>
                  )}
                </div>

                {showPriceExtras && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Cost per item</label>
                      <PriceInput
                        registration={register('cost_price', { valueAsNumber: true })}
                      />
                      <p className="text-xs text-gray-400 mt-1.5">
                        Customers won't see this
                      </p>
                    </div>
                  </div>
                )}

                {/* Expandable chips */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPriceExtras(!showPriceExtras)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                      showPriceExtras
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    Compare at
                    {showPriceExtras && <XMarkIcon className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPriceExtras(!showPriceExtras)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                      showPriceExtras
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    Cost per item
                    {showPriceExtras && <XMarkIcon className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </Card>

            {/* Inventory */}
            <Card title="Inventory">
              <div className="space-y-4">
                {/* Stock quantity for simple products (no variants) */}
                {!variantData.hasVariants && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={simpleStockQty}
                        onChange={(e) => setSimpleStockQty(Number(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                  </div>
                )}

                {/* Expandable SKU / Barcode section */}
                <button
                  type="button"
                  onClick={() => setShowSkuBarcode(!showSkuBarcode)}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border',
                      showSkuBarcode ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-600',
                    )}>
                      SKU
                    </span>
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border',
                      showSkuBarcode ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-600',
                    )}>
                      Barcode
                    </span>
                  </div>
                  {showSkuBarcode ? (
                    <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {showSkuBarcode && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        SKU (Stock Keeping Unit)
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        {...register('sku')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Barcode (ISBN, UPC, GTIN, etc.)
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        {...register('barcode')}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Shipping */}
            <Card
              title="Shipping"
              titleRight={
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">Physical product</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPhysicalProduct}
                    onClick={() => setIsPhysicalProduct(!isPhysicalProduct)}
                    className={clsx(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                      isPhysicalProduct ? 'bg-gray-900' : 'bg-gray-300',
                    )}
                  >
                    <span
                      className={clsx(
                        'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                        isPhysicalProduct ? 'translate-x-[18px]' : 'translate-x-[3px]',
                      )}
                    />
                  </button>
                </label>
              }
            >
              {isPhysicalProduct ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Product weight</label>
                      <div className="flex">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.0"
                          className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          {...register('weight', { valueAsNumber: true })}
                        />
                        <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-sm text-gray-500">
                          kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  This product doesn't require shipping.
                </p>
              )}
            </Card>

            {/* Product Content Sections (Size & Fit, Care, Material) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <button
                type="button"
                onClick={() => setShowContentSections(!showContentSections)}
                className="flex items-center justify-between w-full"
              >
                <h2 className="text-sm font-semibold text-gray-900">Product content sections</h2>
                {showContentSections ? (
                  <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {!showContentSections ? (
                <p className="text-sm text-gray-500 mt-3">
                  Add size & fit, care instructions, and material info for the product detail page
                </p>
              ) : (
                <div className="space-y-6 mt-4">
                  {/* --- Size and Fit --- */}
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800">Size and fit</h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fit type / recommendation</label>
                      <input
                        type="text"
                        placeholder="We recommend ordering your usual size."
                        value={sizeAndFit.fit_type}
                        onChange={(e) => setSizeAndFit((p) => ({ ...p, fit_type: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Model info</label>
                      <input
                        type="text"
                        placeholder='Model is wearing size M and is 6&apos;0" tall, with a 34" chest'
                        value={sizeAndFit.model_info}
                        onChange={(e) => setSizeAndFit((p) => ({ ...p, model_info: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Details (press Enter to add)</label>
                      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg min-h-[38px] focus-within:ring-1 focus-within:ring-gray-400">
                        {sizeAndFit.details.map((item, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                            {item}
                            <button type="button" onClick={() => setSizeAndFit((p) => ({ ...p, details: p.details.filter((_, idx) => idx !== i) }))} className="text-gray-400 hover:text-gray-600">
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={sizeFitDetailInput}
                          onChange={(e) => setSizeFitDetailInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = sizeFitDetailInput.trim();
                              if (val) {
                                setSizeAndFit((p) => ({ ...p, details: [...p.details, val] }));
                                setSizeFitDetailInput('');
                              }
                            }
                          }}
                          placeholder={sizeAndFit.details.length === 0 ? 'Regular fit, Ribbed crewneck...' : ''}
                          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* --- Care Instructions --- */}
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800">Care instructions</h3>

                    {/* Washing items */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Washing instructions</label>
                      {careInstructions.washing.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1.5">
                          <span className="text-base w-6 text-center">{item.icon || '•'}</span>
                          <span className="text-sm flex-1">{item.text}</span>
                          <button type="button" onClick={() => setCareInstructions((p) => ({ ...p, washing: p.washing.filter((_, idx) => idx !== i) }))} className="text-gray-400 hover:text-red-500">
                            <XMarkIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          placeholder="🧺"
                          value={careWashInput.icon}
                          onChange={(e) => setCareWashInput((p) => ({ ...p, icon: e.target.value }))}
                          className="w-12 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                        <input
                          type="text"
                          placeholder="Machine wash warm"
                          value={careWashInput.text}
                          onChange={(e) => setCareWashInput((p) => ({ ...p, text: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (careWashInput.text.trim()) {
                                setCareInstructions((p) => ({
                                  ...p,
                                  washing: [...p.washing, { icon: careWashInput.icon.trim(), text: careWashInput.text.trim() }],
                                }));
                                setCareWashInput({ icon: '', text: '' });
                              }
                            }
                          }}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (careWashInput.text.trim()) {
                              setCareInstructions((p) => ({
                                ...p,
                                washing: [...p.washing, { icon: careWashInput.icon.trim(), text: careWashInput.text.trim() }],
                              }));
                              setCareWashInput({ icon: '', text: '' });
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Extra care */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Extra care info (press Enter to add)</label>
                      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg min-h-[38px] focus-within:ring-1 focus-within:ring-gray-400">
                        {careInstructions.extra_care.map((item, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                            {item}
                            <button type="button" onClick={() => setCareInstructions((p) => ({ ...p, extra_care: p.extra_care.filter((_, idx) => idx !== i) }))} className="text-gray-400 hover:text-gray-600">
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={careExtraInput}
                          onChange={(e) => setCareExtraInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = careExtraInput.trim();
                              if (val) {
                                setCareInstructions((p) => ({ ...p, extra_care: [...p.extra_care, val] }));
                                setCareExtraInput('');
                              }
                            }
                          }}
                          placeholder={careInstructions.extra_care.length === 0 ? 'Use mild detergent only...' : ''}
                          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* --- Material Info --- */}
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800">Material and warmth</h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Composition</label>
                      <input
                        type="text"
                        placeholder="55% cotton, 36% polyester (recycled), 9% viscose"
                        value={materialInfo.composition}
                        onChange={(e) => setMaterialInfo((p) => ({ ...p, composition: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Features (press Enter to add)</label>
                      <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg min-h-[38px] focus-within:ring-1 focus-within:ring-gray-400">
                        {materialInfo.features.map((feat, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                            {feat}
                            <button type="button" onClick={() => setMaterialInfo((p) => ({ ...p, features: p.features.filter((_, idx) => idx !== i) }))} className="text-gray-400 hover:text-gray-600">
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={materialFeatureInput}
                          onChange={(e) => setMaterialFeatureInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = materialFeatureInput.trim();
                              if (val) {
                                setMaterialInfo((p) => ({ ...p, features: [...p.features, val] }));
                                setMaterialFeatureInput('');
                              }
                            }
                          }}
                          placeholder={materialInfo.features.length === 0 ? 'Soft cotton blend, Recycled content...' : ''}
                          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Variants */}
            <VariantManager
              initialOptions={product?.options ?? []}
              initialVariants={product?.variants ?? []}
              basePrice={watchedBasePrice ?? 0}
              productImages={[
                ...images.map((img) => ({ url: img.url, alt: img.alt_text ?? 'Product image' })),
                ...pendingFiles.map((pf) => ({ url: pf.preview, alt: 'Pending upload' })),
              ]}
              onDataChange={handleVariantChange}
            />

            {/* Search engine listing */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <button
                type="button"
                onClick={() => setSeoExpanded(!seoExpanded)}
                className="flex items-center justify-between w-full"
              >
                <h2 className="text-sm font-semibold text-gray-900">Search engine listing</h2>
                <PencilIcon className="h-4 w-4 text-gray-400" />
              </button>

              {!seoExpanded ? (
                <p className="text-sm text-gray-500 mt-3">
                  Add a title and description to see how this product might appear in a search engine listing
                </p>
              ) : (
                <div className="space-y-4 mt-4">
                  {/* SEO Preview */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1">
                    <p className="text-blue-700 text-sm font-medium truncate">
                      {watchedMetaTitle || watchedName || 'Page title'}
                    </p>
                    <p className="text-green-700 text-xs truncate">
                      {window.location.origin}/product/{product?.slug ?? 'product-slug'}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {watchedMetaDesc || 'Add a meta description to see a preview...'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Page title</label>
                    <input
                      type="text"
                      placeholder={watchedName || 'Page title'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      {...register('meta_title')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Meta description</label>
                    <textarea
                      rows={3}
                      placeholder="Brief description for search results..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-y"
                      {...register('meta_description')}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== RIGHT SIDEBAR (1/3) ===== */}
          <div className="space-y-5">
            {/* Status */}
            <Card title="Status">
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                {...register('status')}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Card>

            {/* Product organization */}
            <Card title="Product organization">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
                  <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg min-h-[38px] focus-within:ring-1 focus-within:ring-gray-400 focus-within:border-gray-400">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = tagInput.trim().replace(/,$/, '');
                          if (val && !tags.includes(val)) {
                            setTags((prev) => [...prev, val]);
                          }
                          setTagInput('');
                        }
                        if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                          setTags((prev) => prev.slice(0, -1));
                        }
                      }}
                      onBlur={() => {
                        const val = tagInput.trim().replace(/,$/, '');
                        if (val && !tags.includes(val)) {
                          setTags((prev) => [...prev, val]);
                        }
                        setTagInput('');
                      }}
                      placeholder={tags.length === 0 ? 'Type and press Enter' : ''}
                      className="flex-1 min-w-[80px] text-sm outline-none bg-transparent placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <input
                    type="checkbox"
                    id="is_featured"
                    className="h-4 w-4 border-gray-300 rounded text-gray-900 focus:ring-gray-500"
                    {...register('is_featured')}
                  />
                  <label htmlFor="is_featured" className="text-sm text-gray-700">
                    Featured product
                  </label>
                </div>
              </div>
            </Card>

            {/* Short description */}
            <Card title="Product card">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Short description</label>
                <textarea
                  rows={3}
                  placeholder="Brief text shown on collection pages..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-y"
                  {...register('short_description')}
                />
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between pt-2 mt-5">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this product?')) {
                    adminProductsApi.delete(productId!).then(() => {
                      toast.success('Product deleted');
                      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
                      navigate('/admin/products');
                    }).catch(() => toast.error('Failed to delete product'));
                  }
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Delete product
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Save' : 'Save product'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
