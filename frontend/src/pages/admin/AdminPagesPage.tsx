import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { adminPagesApi } from '@/api/admin.api';
import { formatDate } from '@/utils/formatters';

// --- Types ---

interface CMSPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
  meta_title: string;
  meta_description: string;
  updated_at: string;
  created_at?: string;
}

interface PageFormData {
  title: string;
  content: string;
  is_published: boolean;
  meta_title: string;
  meta_description: string;
}

const EMPTY_FORM: PageFormData = {
  title: '',
  content: '',
  is_published: false,
  meta_title: '',
  meta_description: '',
};

// --- Component ---

export default function AdminPagesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [form, setForm] = useState<PageFormData>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: () => adminPagesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: PageFormData) =>
      adminPagesApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Page created');
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      closeModal();
    },
    onError: () => toast.error('Failed to create page'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PageFormData }) =>
      adminPagesApi.update(id, data as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Page updated');
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      closeModal();
    },
    onError: () => toast.error('Failed to update page'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminPagesApi.delete(id),
    onSuccess: () => {
      toast.success('Page deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
      setDeletingId(null);
    },
    onError: () => toast.error('Failed to delete page'),
  });

  const allPages: CMSPage[] = data?.data ?? [];

  // Client-side search filter
  const pages = search.trim()
    ? allPages.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.slug.toLowerCase().includes(search.toLowerCase())
      )
    : allPages;

  function openCreate() {
    setEditingPage(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(page: CMSPage) {
    setEditingPage(page);
    setForm({
      title: page.title,
      content: page.content,
      is_published: page.is_published,
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingPage(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (editingPage) {
      updateMutation.mutate({ id: editingPage.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Helmet>
        <title>Pages | Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-500" />
              Pages
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Create and manage content pages</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add page
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Search bar */}
          {allPages.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pages..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : pages.length === 0 && !search.trim() ? (
            <div className="text-center py-20">
              <DocumentTextIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No pages yet</p>
              <button
                onClick={openCreate}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Create your first page
              </button>
            </div>
          ) : pages.length === 0 && search.trim() ? (
            <div className="text-center py-16">
              <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No pages matching "{search}"
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Page
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                      Slug
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                      Last updated
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr
                      key={page.id}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {page.title}
                            </p>
                            {page.meta_description && (
                              <p className="text-xs text-gray-400 truncate max-w-[240px]">
                                {page.meta_description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className="text-gray-500 font-mono text-xs">
                          /{page.slug}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            page.is_published
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              page.is_published
                                ? 'bg-green-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {page.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs hidden sm:table-cell">
                        {formatDate(page.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {page.is_published && (
                            <a
                              href={`/pages/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                              title="View page"
                            >
                              <EyeIcon className="h-4 w-4 text-gray-500" />
                            </a>
                          )}
                          <button
                            onClick={() => openEdit(page)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4 text-gray-500" />
                          </button>
                          {deletingId === page.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => deleteMutation.mutate(page.id)}
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
                              onClick={() => setDeletingId(page.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {pages.length} page{pages.length !== 1 ? 's' : ''}
                {search.trim() && ` matching "${search}"`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">
                {editingPage ? 'Edit page' : 'Add page'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="e.g. About Us"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Content
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 min-h-[200px] resize-y"
                  placeholder="Write your page content here... (HTML supported)"
                  rows={8}
                />
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="page_published"
                  checked={form.is_published}
                  onChange={(e) =>
                    setForm({ ...form, is_published: e.target.checked })
                  }
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <label
                  htmlFor="page_published"
                  className="text-sm font-medium text-gray-700"
                >
                  Published
                </label>
              </div>

              {/* SEO Section */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  SEO
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Meta title
                    </label>
                    <input
                      type="text"
                      value={form.meta_title}
                      onChange={(e) =>
                        setForm({ ...form, meta_title: e.target.value })
                      }
                      placeholder="SEO title (defaults to page title)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Meta description
                    </label>
                    <textarea
                      value={form.meta_description}
                      onChange={(e) =>
                        setForm({ ...form, meta_description: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 min-h-[70px] resize-y"
                      placeholder="Brief description for search engines..."
                      rows={2}
                    />
                  </div>
                </div>
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
                  {isSaving
                    ? 'Saving...'
                    : editingPage
                    ? 'Save changes'
                    : 'Add page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
