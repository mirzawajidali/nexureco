import type { Product, ProductVariant } from './product';

export interface CartItem {
  id: number;
  product_id: number;
  variant_id: number | null;
  quantity: number;
  product: Product;
  variant: ProductVariant | null;
}

export interface CartSummaryData {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
  coupon_code: string | null;
}
