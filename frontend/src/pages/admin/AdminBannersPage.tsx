import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { adminBannersApi, adminMediaApi } from '@/api/admin.api';

// --- Types ---

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  mobile_image_url: string;
  link_url: string;
  button_text: string;
  position: 'hero' | 'promo' | 'announcement';
  display_order: number;
  is_active: boolean;
}

interface BannerFormData {
  title: string;
  subtitle: string;
  image_url: string;
  mobile_image_url: string;
  link_url: string;
  button_text: string;
  position: string;
  display_order: number;
  is_active: boolean;
}

const EMPTY_FORM: BannerFormData = {
  title: '',
  subtitle: '',
  image_url: '',
  mobile_image_url: '',
  link_url: '',
  button_text: '',
  position: 'hero',
  display_order: 0,
  is_active: true,
};

const POSITION_OPTIONS = [
  { value: 'hero', label: 'Hero' },
  { value: 'promo', label: 'Promo' },
  { value: 'announcement', label: 'Announcement' },
];

function positionBadge(pos: string) {
  switch (pos) {
    case 'hero':
      return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'promo':
      return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  }
}

// --- Component ---

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerFormData>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
  const ACCEPT_STR = '.jpg,.jpeg,.png,.gif,.webp,.avif';

  async function handleImageUpload(
    file: File,
    field: 'image_url' | 'mobile_image_url',
  ) {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error(`Unsupported format: ${ext}`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5MB limit');
      return;
    }

    const setUploading = field === 'image_url' ? setUploadingDesktop : setUploadingMobile;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminMediaApi.upload(fd);
      const url = (res.data as { url?: string })?.url;
      if (url) {
        setForm((prev) => ({ ...prev, [field]: url }));
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  function handleFileDrop(
    e: React.DragEvent,
    field: 'image_url' | 'mobile_image_url',
  ) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file, field);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => adminBannersApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: BannerFormData) =>
      adminBannersApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Banner created');
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      closeModal();
    },
    onError: () => toast.error('Failed to create banner'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BannerFormData }) =>
      adminBannersApi.update(id, data as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Banner updated');
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      closeModal();
    },
    onError: () => toast.error('Failed to update banner'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminBannersApi.delete(id),
    onSuccess: () => {
      toast.success('Banner deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      setDeletingId(null);
    },
    onError: () => toast.error('Failed to delete banner'),
  });

  const banners: Banner[] = data?.data ?? [];

  function openCreate() {
    setEditingBanner(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(banner: Banner) {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle,
      image_url: banner.image_url,
      mobile_image_url: banner.mobile_image_url,
      link_url: banner.link_url,
      button_text: banner.button_text,
      position: banner.position,
      display_order: banner.display_order,
      is_active: banner.is_active,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingBanner(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Helmet>
        <title>Banners | Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <PhotoIcon className="h-5 w-5 text-gray-500" />
              Banners
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage homepage banners and promotions</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add banner
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-20">
              <PhotoIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No banners yet</p>
              <button onClick={openCreate} className="mt-3 text-sm text-blue-600 hover:underline">
                Create your first banner
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Banner
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                      Position
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                      Order
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {banners.map((banner) => {
                    const posBadge = positionBadge(banner.position);
                    return (
                      <tr
                        key={banner.id}
                        className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {banner.image_url ? (
                              <img
                                src={banner.image_url}
                                alt={banner.title}
                                className="h-10 w-16 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                <PhotoIcon className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{banner.title}</p>
                              {banner.subtitle && (
                                <p className="text-xs text-gray-400 truncate">{banner.subtitle}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${posBadge.bg} ${posBadge.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${posBadge.dot}`} />
                            {banner.position.charAt(0).toUpperCase() + banner.position.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600 hidden sm:table-cell">
                          {banner.display_order}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              banner.is_active
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${banner.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {banner.is_active ? 'Active' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(banner)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4 text-gray-500" />
                            </button>
                            {deletingId === banner.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => deleteMutation.mutate(banner.id)}
                                  className="px-2.5 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(banner.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {banners.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {banners.length} banner{banners.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">
                {editingBanner ? 'Edit banner' : 'Add banner'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subtitle</label>
                  <input
                    type="text"
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
              </div>

              {/* Desktop Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Desktop image</label>
                {form.image_url ? (
                  <div className="relative group rounded-lg border border-gray-200 overflow-hidden">
                    <img
                      src={form.image_url}
                      alt="Desktop banner"
                      className="w-full h-32 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: '' })}
                      className="absolute top-1.5 right-1.5 p-1 bg-white/90 rounded-full shadow hover:bg-red-50 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4 text-red-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => desktopInputRef.current?.click()}
                      className="absolute bottom-1.5 right-1.5 px-2 py-1 bg-white/90 rounded-md shadow text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleFileDrop(e, 'image_url')}
                    onClick={() => desktopInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    {uploadingDesktop ? (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        <span className="text-sm text-gray-500">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <ArrowUpTrayIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-sm text-gray-500">Click or drag to upload</p>
                        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP, AVIF, GIF (max 5MB)</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={desktopInputRef}
                  type="file"
                  accept={ACCEPT_STR}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'image_url');
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Mobile Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile image <span className="text-gray-400 font-normal">(optional)</span></label>
                {form.mobile_image_url ? (
                  <div className="relative group rounded-lg border border-gray-200 overflow-hidden">
                    <img
                      src={form.mobile_image_url}
                      alt="Mobile banner"
                      className="w-full h-32 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, mobile_image_url: '' })}
                      className="absolute top-1.5 right-1.5 p-1 bg-white/90 rounded-full shadow hover:bg-red-50 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4 text-red-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => mobileInputRef.current?.click()}
                      className="absolute bottom-1.5 right-1.5 px-2 py-1 bg-white/90 rounded-md shadow text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleFileDrop(e, 'mobile_image_url')}
                    onClick={() => mobileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    {uploadingMobile ? (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        <span className="text-sm text-gray-500">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <ArrowUpTrayIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-sm text-gray-500">Click or drag to upload</p>
                        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP, AVIF, GIF (max 5MB)</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={mobileInputRef}
                  type="file"
                  accept={ACCEPT_STR}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'mobile_image_url');
                    e.target.value = '';
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Link URL</label>
                  <input
                    type="text"
                    value={form.link_url}
                    onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                    placeholder="/collections/sale"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Button text</label>
                  <input
                    type="text"
                    value={form.button_text}
                    onChange={(e) => setForm({ ...form, button_text: e.target.value })}
                    placeholder="Shop Now"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Position</label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                  >
                    {POSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Display order</label>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="banner_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <label htmlFor="banner_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Saving...' : editingBanner ? 'Save changes' : 'Add banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
