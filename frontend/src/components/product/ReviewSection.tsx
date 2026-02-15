import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline, ChevronDownIcon, HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { reviewApi } from '@/api/user.api';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import type { Review, ReviewSummary } from '@/types/review';

interface ReviewSectionProps {
  productId: number;
}

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

export default function ReviewSection({ productId }: ReviewSectionProps) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const queryClient = useQueryClient();

  const { data: summaryData } = useQuery({
    queryKey: ['review-summary', productId],
    queryFn: () => reviewApi.getReviewSummary(productId),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', productId, page],
    queryFn: () => reviewApi.getProductReviews(productId, page),
  });

  const summary: ReviewSummary | undefined = summaryData?.data;
  const reviews: Review[] = reviewsData?.data?.items || [];
  const totalPages = reviewsData?.data?.total_pages || 0;
  const totalReviews = summary?.total_reviews || 0;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0 },
  });

  const selectedRating = watch('rating');

  const mutation = useMutation({
    mutationFn: (data: ReviewFormData) =>
      reviewApi.create({ product_id: productId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['review-summary', productId] });
      toast.success('Review submitted!');
      setShowForm(false);
      reset();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    },
  });

  // Filter and sort reviews client-side
  const filteredReviews = reviews
    .filter((r) => (starFilter ? r.rating === starFilter : true))
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest': return b.rating - a.rating;
        case 'lowest': return a.rating - b.rating;
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  return (
    <div className="border-t border-gray-200">
      {/* Accordion header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-bold text-brand-black">
          Reviews{totalReviews > 0 ? ` (${totalReviews})` : ''}
        </span>
        <div className="flex items-center gap-3">
          {summary && totalReviews > 0 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon
                  key={i}
                  className={clsx(
                    'h-4 w-4',
                    i < Math.round(summary.avg_rating) ? 'text-brand-black' : 'text-gray-300'
                  )}
                />
              ))}
            </div>
          )}
          <ChevronDownIcon
            className={clsx(
              'h-5 w-5 text-brand-black transition-transform duration-300',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-[5000px] opacity-100 pb-8' : 'max-h-0 opacity-0'
        )}
      >
        {totalReviews === 0 && !showForm ? (
          <div className="text-center py-8 bg-gray-50">
            <p className="text-sm text-gray-500 mb-4">No reviews yet. Be the first to review!</p>
            {user && (
              <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>
                Write a Review
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Rating overview — large number + stars + Write a review */}
            {summary && totalReviews > 0 && (
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-bold text-brand-black">
                    {summary.avg_rating.toFixed(1)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarIcon
                        key={i}
                        className={clsx(
                          'h-5 w-5',
                          i < Math.round(summary.avg_rating) ? 'text-brand-black' : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                </div>
                {user && !showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-6 py-3 border border-brand-black text-sm font-bold hover:bg-gray-50 transition-colors"
                  >
                    Write a review
                    <span className="text-lg">&rarr;</span>
                  </button>
                )}
              </div>
            )}

            {/* Rating breakdown bars */}
            {summary && totalReviews > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-3 mb-8">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.rating_breakdown[String(star)] || 0;
                  const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-8">
                        <StarIcon className="h-3 w-3 text-brand-black" />
                        <span className="text-xs font-bold">{star}</span>
                      </div>
                      <div className="flex-1 h-1.5 bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-brand-black transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Filter by star rating + Sort */}
            {totalReviews > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
                <div>
                  <p className="text-xs font-bold text-brand-black mb-2">Filter by star rating</p>
                  <div className="flex gap-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <button
                        key={star}
                        onClick={() => setStarFilter(starFilter === star ? null : star)}
                        className={clsx(
                          'flex items-center gap-1 px-3 py-1.5 border text-xs transition-colors',
                          starFilter === star
                            ? 'border-brand-black bg-brand-black text-white'
                            : 'border-gray-300 hover:border-brand-black'
                        )}
                      >
                        <StarIcon className="h-3 w-3" />
                        {star}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-black mb-2">Sort by</p>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-brand-black"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="highest">Highest rating</option>
                    <option value="lowest">Lowest rating</option>
                  </select>
                </div>
              </div>
            )}

            {/* Review Form */}
            {showForm && (
              <div className="border border-gray-200 p-6 mb-8">
                <h3 className="text-sm font-bold text-brand-black mb-4">
                  Write Your Review
                </h3>
                <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-brand-black block mb-1">Rating</label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setValue('rating', star)}
                        >
                          {(hoverRating || selectedRating) >= star ? (
                            <StarIcon className="h-7 w-7 text-brand-black" />
                          ) : (
                            <StarOutline className="h-7 w-7 text-gray-300" />
                          )}
                        </button>
                      ))}
                    </div>
                    {errors.rating && (
                      <p className="mt-1 text-xs text-error">{errors.rating.message}</p>
                    )}
                  </div>

                  <Input label="Title (optional)" {...register('title')} />
                  <div>
                    <label className="text-xs font-bold text-brand-black block mb-1">Comment (optional)</label>
                    <textarea
                      {...register('comment')}
                      rows={4}
                      className="input-field resize-none"
                      placeholder="Share your experience..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" size="sm" isLoading={mutation.isPending}>
                      Submit Review
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowForm(false);
                        reset();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Reviews List */}
            <div className="divide-y divide-gray-200">
              {filteredReviews.map((review) => (
                <div key={review.id} className="py-6">
                  <div className="flex flex-col sm:flex-row sm:gap-12">
                    {/* Left: stars + username */}
                    <div className="sm:w-48 flex-shrink-0 mb-3 sm:mb-0">
                      <div className="flex items-center gap-0.5 mb-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <StarIcon
                            key={i}
                            className={clsx(
                              'h-3.5 w-3.5',
                              i < review.rating ? 'text-brand-black' : 'text-gray-300'
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-brand-black">{review.user_name}</p>
                    </div>

                    {/* Right: title, comment, date, actions */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          {review.title && (
                            <p className="font-bold text-sm mb-1">{review.title}</p>
                          )}
                          {review.comment && (
                            <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatDate(review.created_at)}
                        </span>
                      </div>

                      {review.images.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {review.images.map((img) => (
                            <img
                              key={img.id}
                              src={img.url}
                              alt="Review"
                              className="w-16 h-16 object-cover bg-gray-100"
                            />
                          ))}
                        </div>
                      )}

                      {/* Helpful + Report */}
                      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                        <span>Helpful?</span>
                        <button
                          onClick={() => toast.success('Thanks for your feedback!')}
                          className="flex items-center gap-1 hover:text-brand-black transition-colors"
                        >
                          <HandThumbUpIcon className="h-3.5 w-3.5" />
                          {review.helpful_count || 0}
                        </button>
                        <button
                          onClick={() => toast.success('Thanks for your feedback!')}
                          className="flex items-center gap-1 hover:text-brand-black transition-colors"
                        >
                          <HandThumbDownIcon className="h-3.5 w-3.5" />
                          0
                        </button>
                        <button
                          onClick={() => toast.success('Review reported. We\'ll look into it.')}
                          className="underline hover:text-brand-black transition-colors ml-auto"
                        >
                          Report review
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
