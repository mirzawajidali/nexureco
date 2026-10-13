import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  NewspaperIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { adminBlogApi } from '@/api/blog.api';
import { blogPostStatus, type BlogPostStatus } from '@/utils/blog';
import { formatDate } from '@/utils/formatters';
import { resizedImage } from '@/utils/image';

const STATUS_STYLE: Record<BlogPostStatus, { label: string; badge: string; dot: string }> = {
  published: { label: 'Published', badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  scheduled: { label: 'Scheduled', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  draft: { label: 'Draft', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
};

export default function AdminBlogPostsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: allPosts = [], isLoading } = useQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: () => adminBlogApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminBlogApi.delete(id),
    onSuccess: () => {
      toast.success('Post deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
      setDeletingId(null);
    },
    onError: () => toast.error('Failed to delete post'),
  });

  const term = search.trim().toLowerCase();
  const posts = term
    ? allPosts.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.slug.includes(term) ||
          (p.category ?? '').toLowerCase().includes(term)
      )
    : allPosts;

  return (
    <>
      <Helmet>
        <title>Blog | Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <NewspaperIcon className="h-5 w-5 text-gray-500" />
              Blog
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Write articles for the blog and the homepage blog slider
            </p>
          </div>
          <Link
            to="/admin/blog/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New post
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {allPosts.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search posts..."
                  aria-label="Search posts"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : allPosts.length === 0 ? (
            <div className="text-center py-20">
              <NewspaperIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No posts yet</p>
              <Link to="/admin/blog/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
                Write your first post
              </Link>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No posts matching "{search}"</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Post</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                      Category
                    </th>
                    <th className="text-center px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                      Publish date
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => {
                    const status = STATUS_STYLE[blogPostStatus(post)];
                    return (
                      <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-3">
                          <Link to={`/admin/blog/${post.id}`} className="flex items-center gap-3">
                            <div className="h-11 w-16 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                              {post.cover_image_url ? (
                                <img
                                  src={resizedImage(post.cover_image_url, 160)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <NewspaperIcon className="h-4 w-4 text-gray-400 m-auto mt-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate max-w-[360px] flex items-center gap-1.5">
                                {post.is_featured && (
                                  <StarIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" aria-label="Featured" />
                                )}
                                {post.title}
                              </p>
                              <p className="text-xs text-gray-400 font-mono truncate max-w-[360px]">/blog/{post.slug}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-gray-600 text-xs hidden md:table-cell">{post.category || '—'}</td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-xs hidden sm:table-cell">
                          {post.published_at ? formatDate(post.published_at) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {blogPostStatus(post) === 'published' && (
                              <a
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                title="View post"
                              >
                                <EyeIcon className="h-4 w-4 text-gray-500" />
                              </a>
                            )}
                            <Link
                              to={`/admin/blog/${post.id}`}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4 text-gray-500" />
                            </Link>
                            {deletingId === post.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => deleteMutation.mutate(post.id)}
                                  disabled={deleteMutation.isPending}
                                  className="px-2.5 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
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
                                onClick={() => setDeletingId(post.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
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

          {posts.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {posts.length} post{posts.length !== 1 ? 's' : ''}
                {term && ` matching "${search}"`}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
