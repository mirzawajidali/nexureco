export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export interface Order {
  id: number;
  user_id: number | null;
  order_number: string;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  coupon_code: string | null;
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_phone: string;
  shipping_address1: string;
  shipping_address2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  tracking_number: string | null;
  tracking_url: string | null;
  customer_note: string | null;
  admin_note: string | null;
  items: OrderItem[];
  status_history: OrderStatusHistory[];
  created_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  variant_info: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url: string | null;
}

export interface OrderStatusHistory {
  id: number;
  status: string;
  note: string | null;
  created_at: string;
}

export interface CheckoutData {
  shipping_address_id?: number;
  shipping_first_name: string;
  shipping_last_name: string;
  shipping_phone: string;
  shipping_address1: string;
  shipping_address2?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  customer_note?: string;
  coupon_code?: string;
}
