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
