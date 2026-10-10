/** POST /coupons/validate: what a promo code takes off the current bag */
export interface CouponCheck {
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  discount_amount: number;
  description: string | null;
}

export interface Coupon {
  id: number;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed_amount';
  value: number;
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  usage_per_customer: number;
  used_count: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}
