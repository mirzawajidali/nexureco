import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import {
  ChatBubbleLeftRightIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { adminReviewsApi } from '@/api/admin.api';
import Spinner from '@/components/ui/Spinner';
import { formatDate } from '@/utils/formatters';

interface Review {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  product_name: string;
  user_name: string;
  is_approved: boolean;
  helpful_count: number;
  created_at: string;
}

type StatusFilter = 'all' | 'approved' | 'pending';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Published' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={clsx(
            'h-3.5 w-3.5',
            i < rating ? 'text-amber-400' : 'text-gray-200'
          )}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const queryParams: Record<string, unknown> = { page, page_size: 20 };
  if (statusFilter === 'approved') queryParams.is_approved = true;
  if (statusFilter === 'pending') queryParams.is_approved = false;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', page, statusFilter],
    queryFn: () => adminReviewsApi.list(queryParams).then((res) => res.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminReviewsApi.approve(id),
    onSuccess: () => {
      toast.success('Review approved');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: () => toast.error('Failed to approve review'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => adminReviewsApi.reject(id),
    onSuccess: () => {
      toast.success('Review rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: () => toast.error('Failed to reject review'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminReviewsApi.delete(id),
    onSuccess: () => {
      toast.success('Review deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setDeletingId(null);
    },
    onError: () => toast.error('Failed to delete review'),
  });

  const reviews: Review[] = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;

  function handleFilterChange(filter: StatusFilter) {
    setStatusFilter(filter);
    setPage(1);
  }

  return (
    <>
      <Helmet>
        <title>Reviews | Admin - My Brand</title>
      </Helmet>

      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <StarIconOutline className="h-5 w-5 text-gray-500" />
            Reviews
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor and manage product reviews</p>
        </div>

        {/* Card with tabs + content */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Status Tabs */}
          <div className="border-b border-gray-200 px-5">
            <div className="flex gap-0">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleFilterChange(tab.value)}
                  className={clsx(
                    'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                    statusFilter === tab.value
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center">
              <ChatBubbleLeftRightIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">No reviews found</p>
              <p className="text-sm text-gray-500">
                {statusFilter === 'pending'
                  ? 'No pending reviews to moderate'
                  : statusFilter === 'approved'
                    ? 'No published reviews yet'
                    : 'Reviews will appear here when customers submit them'}
              </p>
            </div>
          ) : (
            <>
              {/* Reviews List */}
              <div className="divide-y divide-gray-100">
                {reviews.map((review) => (
                  <div key={review.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Review Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Top row: stars + status */}
                        <div className="flex items-center gap-3">
                          <Stars rating={review.rating} />
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                              review.is_approved
                                ? 'bg-green-50 text-green-700'
                                : 'bg-yellow-50 text-yellow-700'
                            )}
                          >
                            <span className={clsx(
                              'w-1.5 h-1.5 rounded-full',
                              review.is_approved ? 'bg-green-500' : 'bg-yellow-500'
                            )} />
                            {review.is_approved ? 'Published' : 'Pending'}
                          </span>
                        </div>

                        {/* Title */}
                        {review.title && (
                          <p className="text-sm font-medium text-gray-900">
                            {review.title}
                          </p>
                        )}

                        {/* Comment */}
                        {review.comment && (
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                            {review.comment}
                          </p>
                        )}

                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>
                            <span className="text-gray-600 font-medium">{review.user_name}</span>
                            {' '}on{' '}
                            <span className="text-gray-600">{review.product_name}</span>
                          </span>
                          <span>&middot;</span>
                          <span>{formatDate(review.created_at)}</span>
                          {review.helpful_count > 0 && (
                            <>
                              <span>&middot;</span>
                              <span>{review.helpful_count} found helpful</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!review.is_approved ? (
                          <button
                            onClick={() => approveMutation.mutate(review.id)}
                            disabled={approveMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => rejectMutation.mutate(review.id)}
                            disabled={rejectMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            <XMarkIcon className="h-3.5 w-3.5" />
                            Unpublish
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingId(review.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {total} review{total !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <span className="px-3 text-sm text-gray-600">
                      {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setDeletingId(null)}
          />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Delete review?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              This action cannot be undone. The review will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deletingId !== null) deleteMutation.mutate(deletingId);
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
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
