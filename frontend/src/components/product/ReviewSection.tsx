import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StarIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline, ChevronDownIcon, HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { reviewApi } from '@/api/user.api';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import ReviewPhotoPicker from './ReviewPhotoPicker';
import ReviewPhotos from './ReviewPhotos';
import { trackEvent } from '@/utils/analytics';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import type { Review, ReviewSummary } from '@/types/review';

interface ReviewSectionProps {
  productId: number;
}

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  title: z.string().optional(),
  comment: z.string().max(2000, 'Please keep it under 2,000 characters').optional(),
  // Without an account: proof of purchase (checked in onSubmit, since they don't apply to signed-in users)
  name: z.string().max(60).optional(),
  order_number: z.string().optional(),
  contact: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

export default function ReviewSection({ productId }: ReviewSectionProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  // Review-request emails link to /product/<slug>#reviews: open the panel and scroll to it
  const linkedToReviews = location.hash === '#reviews';
  const [isOpen, setIsOpen] = useState(linkedToReviews);
  useEffect(() => {
    if (!linkedToReviews) return;
    const timer = setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }), 100);
    return () => clearTimeout(timer);
  }, [linkedToReviews]);
  // The "order delivered" email links here with ?review_order=<number>, so the form opens pre-filled
  const emailedOrderNumber = new URLSearchParams(location.search).get('review_order') ?? '';
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(linkedToReviews && !!emailedOrderNumber);
  const [hoverRating, setHoverRating] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
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
    setError,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, order_number: emailedOrderNumber },
  });

  const selectedRating = watch('rating');

  const mutation = useMutation({
    // The review is saved first; its photos are then uploaded one by one with the token it returns,
    // so a photo that fails to upload never loses the review itself
    mutationFn: async ({ rating, title, comment, name, order_number, contact }: ReviewFormData) => {
      const res = user
        ? await reviewApi.create({ product_id: productId, rating, title, comment })
        : await reviewApi.createVerified({
            product_id: productId,
            rating,
            title,
            comment,
            name: name?.trim() || undefined,
            order_number: (order_number ?? '').trim(),
            contact: (contact ?? '').trim(),
          });
      const created = res.data as Review & { photo_upload_token?: string };
      let failedPhotos = 0;
      for (const file of photos) {
        try {
          await reviewApi.uploadPhoto(created.id, created.photo_upload_token ?? '', file);
        } catch {
          failedPhotos += 1;
        }
      }
      return { failedPhotos };
    },
    onSuccess: ({ failedPhotos }, data) => {
      trackEvent('submit_review', { item_id: String(productId), rating: data.rating, photos: photos.length });
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['review-summary', productId] });
      if (failedPhotos > 0) {
        toast.error(`Review posted, but ${failedPhotos} photo${failedPhotos > 1 ? "s" : ''} couldn't be uploaded`);
      } else {
        toast.success('Thanks! Your review is live.');
      }
      setShowForm(false);
      setPhotos([]);
      reset({ rating: 0 });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    },
  });

  const onSubmit = (data: ReviewFormData) => {
    if (!user) {
      let missing = false;
      if (!data.order_number?.trim()) {
        setError('order_number', { message: 'Enter your order number' });
        missing = true;
      }
      if (!data.contact?.trim()) {
        setError('contact', { message: 'Enter the email or phone number you ordered with' });
        missing = true;
      }
      if (missing) return;
    }
    mutation.mutate(data);
  };

  const writeReviewButton = (
    <button
      type="button"
      onClick={() => setShowForm(true)}
      className="flex items-center gap-2 px-6 py-3 border border-brand-black text-sm font-bold hover:bg-gray-50 transition-colors"
    >
      Write a review
      <span className="text-lg" aria-hidden>&rarr;</span>
    </button>
  );

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
    <div id="reviews" className="border-t border-gray-200">
      {/* Accordion header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="reviews-panel"
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
        id="reviews-panel"
        className={clsx(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-[5000px] opacity-100 pb-8' : 'max-h-0 opacity-0'
        )}
      >
        {totalReviews === 0 && !showForm ? (
          <div className="text-center py-8 bg-gray-50">
            <p className="text-sm text-gray-500 mb-4">No reviews yet. Bought this tee? Be the first to review it.</p>
            <div className="flex justify-center">{writeReviewButton}</div>
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
                {!showForm && writeReviewButton}
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
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  {!user && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        Reviews are from customers whose order has been delivered. Enter your order number and the
                        email or phone number you ordered with, or{' '}
                        <Link
                          to="/login"
                          state={{ from: { pathname: `${location.pathname}#reviews` } }}
                          className="font-bold underline hover:text-gray-600"
                        >
                          sign in
                        </Link>
                        .
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Order number"
                          placeholder="e.g. MB-12345678"
                          autoComplete="off"
                          error={errors.order_number?.message}
                          {...register('order_number')}
                        />
                        <Input
                          label="Email or phone"
                          placeholder="As used for the order"
                          autoComplete="email"
                          error={errors.contact?.message}
                          {...register('contact')}
                        />
                      </div>
                      <Input
                        label="Name shown with your review (optional)"
                        placeholder="Defaults to the first name on the order"
                        autoComplete="given-name"
                        maxLength={60}
                        error={errors.name?.message}
                        {...register('name')}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-brand-black block mb-1">Rating</label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          aria-pressed={selectedRating === star}
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
                  <ReviewPhotoPicker files={photos} onChange={setPhotos} />
                  <div>
                    <label htmlFor="review-comment" className="text-xs font-bold text-brand-black block mb-1">
                      Comment (optional)
                    </label>
                    <textarea
                      id="review-comment"
                      maxLength={2000}
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
                        setPhotos([]);
                        reset({ rating: 0 });
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
                      {review.is_verified && (
                        <p className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                          <CheckBadgeIcon className="h-4 w-4 text-success" aria-hidden="true" />
                          Verified purchase
                        </p>
                      )}
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

                      <ReviewPhotos images={review.images} reviewer={review.user_name} />

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
