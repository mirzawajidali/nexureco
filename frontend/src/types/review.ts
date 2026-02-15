export interface Review {
  id: number;
  product_id: number;
  user_name: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  helpful_count: number;
  images: ReviewImage[];
  created_at: string;
}

export interface ReviewImage {
  id: number;
  url: string;
}

export interface ReviewSummary {
  avg_rating: number;
  total_reviews: number;
  rating_breakdown: Record<string, number>;
}

export interface CreateReviewData {
  product_id: number;
  rating: number;
  title?: string;
  comment?: string;
}
