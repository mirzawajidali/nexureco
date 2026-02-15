import { useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid';
import {
  ArrowUpTrayIcon,
  PhotoIcon,
  TrashIcon,
  LinkIcon,
  ClipboardIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { adminMediaApi } from '@/api/admin.api';
import { formatDate } from '@/utils/formatters';

// --- Types ---

interface LinkedProduct {
  id: number;
  name: string;
}

interface MediaItem {
  id: number;
  url: string;
  original_filename: string;
  file_size: number;
  content_type: string | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  created_at: string;
  linked_products: LinkedProduct[];
}

interface MediaListResponse {
  items: MediaItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// --- Helpers ---

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(contentType: string | null, filename: string): string {
  if (contentType) {
    const sub = contentType.split('/')[1]?.toUpperCase();
    if (sub) return sub;
  }
  const ext = filename.split('.').pop()?.toUpperCase();
  return ext || 'FILE';
}

function formatMediaDate(dateString: string): string {
  const d = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// --- Component ---

export default function AdminMediaPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<MediaItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const pageSize = 50;

  // --- Query ---

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'media', page, search],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (search) params.q = search;
      const res = await adminMediaApi.list(params);
      return res.data as MediaListResponse;
    },
  });

  // --- Mutations ---

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const results = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await adminMediaApi.upload(formData);
        results.push(res.data);
      }
      return results;
    },
    onSuccess: (data) => {
      toast.success(`${data.length} file${data.length > 1 ? 's' : ''} uploaded`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
    },
    onError: () => toast.error('Failed to upload file'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminMediaApi.delete(id),
    onSuccess: () => {
      toast.success('File deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
      setDeletingId(null);
      if (selectedFile?.id === deletingId) setSelectedFile(null);
    },
    onError: () => toast.error('Failed to delete file'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) await adminMediaApi.delete(id);
    },
    onSuccess: () => {
      toast.success('Files deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'media'] });
      setSelectedIds(new Set());
    },
    onError: () => toast.error('Failed to delete some files'),
  });

  // --- Data ---

  const items = data?.items ?? [];
  const totalPages = data?.total_pages ?? 0;
  const total = data?.total ?? 0;
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  // --- Handlers ---

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
    const validFiles: File[] = [];
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
    if (validFiles.length > 0) uploadMutation.mutate(validFiles);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
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
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.id)));
  }

  function copyUrl(url: string) {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success('URL copied');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Helmet>
        <title>Files | Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <PhotoIcon className="h-5 w-5 text-gray-500" />
              Files
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Upload and manage your media files</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            Upload files
          </button>
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

        {/* Card */}
        <div
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {/* Search + Bulk actions bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search files"
                className="w-full pl-9 pr-3 py-[7px] border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              />
            </form>
            {selectedIds.size > 0 && (
              <button
                onClick={() => bulkDeleteMutation.mutate([...selectedIds])}
                disabled={bulkDeleteMutation.isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Delete {selectedIds.size}
              </button>
            )}
          </div>

          {/* Drag overlay */}
          {isDragging && (
            <div className="px-4 py-8 text-center border-b border-gray-200 bg-blue-50">
              <ArrowUpTrayIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-700">Drop files here to upload</p>
            </div>
          )}

          {/* Upload progress */}
          {uploadMutation.isPending && (
            <div className="px-4 py-4 text-center border-b border-gray-200">
              <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-1" />
              <p className="text-sm text-gray-500">Uploading...</p>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <PhotoIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {search ? `No files match "${search}"` : 'No files uploaded yet'}
              </p>
              {!search && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-sm text-blue-600 hover:underline"
                >
                  Upload your first file
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
                        checked={selectedIds.size === items.length && items.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                      />
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      File name
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                      Alt text
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                      Date added
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                      Size
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                      References
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors group ${
                        selectedIds.has(item.id) ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setSelectedFile(item)}
                          className="flex items-center gap-3 text-left"
                        >
                          <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 bg-gray-100">
                            <img
                              src={item.url}
                              alt={item.alt_text ?? item.original_filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px] sm:max-w-[300px] group-hover:text-blue-600">
                              {item.original_filename}
                            </p>
                            <p className="text-xs text-gray-400">{getFileType(item.content_type, item.original_filename)}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs hidden lg:table-cell max-w-[150px] truncate">
                        {item.alt_text || '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-500 hidden sm:table-cell">
                        {formatMediaDate(item.created_at)}
                      </td>
                      <td className="px-3 py-3 text-gray-500 hidden md:table-cell">
                        {formatFileSize(item.file_size)}
                      </td>
                      <td className="px-3 py-3 text-gray-500 hidden lg:table-cell">
                        {item.linked_products.length > 0
                          ? `${item.linked_products.length} product${item.linked_products.length > 1 ? 's' : ''}`
                          : '—'}
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
                {total} file{total !== 1 ? 's' : ''}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
                  </button>
                  <span className="text-sm text-gray-700 min-w-[80px] text-center">
                    {startIndex}–{endIndex} of {total}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Detail Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setSelectedFile(null); setCopied(false); }} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">File details</h2>
              <button
                onClick={() => { setSelectedFile(null); setCopied(false); }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">
              {/* Preview */}
              <div className="bg-gray-100 rounded-lg border border-gray-200 aspect-square flex items-center justify-center overflow-hidden">
                <img
                  src={selectedFile.url}
                  alt={selectedFile.alt_text ?? selectedFile.original_filename}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Filename</p>
                  <p className="text-sm font-medium break-all">{selectedFile.original_filename}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">URL</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 flex-1 truncate border border-gray-200 rounded-lg">
                      {selectedFile.url}
                    </code>
                    <button
                      onClick={() => copyUrl(selectedFile.url)}
                      className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
                    >
                      {copied ? <CheckIcon className="h-4 w-4 text-green-600" /> : <ClipboardIcon className="h-4 w-4 text-gray-500" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Type</p>
                    <p className="text-sm">{selectedFile.content_type ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Size</p>
                    <p className="text-sm">{formatFileSize(selectedFile.file_size)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Dimensions</p>
                    <p className="text-sm">
                      {selectedFile.width && selectedFile.height ? `${selectedFile.width} × ${selectedFile.height} px` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Uploaded</p>
                    <p className="text-sm">{formatDate(selectedFile.created_at)}</p>
                  </div>
                </div>

                {/* References */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">References</p>
                  {selectedFile.linked_products.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedFile.linked_products.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/admin/products/${p.id}`}
                            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                            onClick={() => setSelectedFile(null)}
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                            {p.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">Not linked to any product</p>
                  )}
                </div>

                {/* Delete */}
                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setDeletingId(selectedFile.id);
                      setSelectedFile(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete file
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-[15px] font-semibold text-gray-900 mb-2">Delete file?</h3>
            <p className="text-sm text-gray-600 mb-5">
              This will permanently delete the file from your server. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (deletingId !== null) deleteMutation.mutate(deletingId); }}
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
