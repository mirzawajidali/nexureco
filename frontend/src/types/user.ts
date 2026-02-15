export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'customer' | 'admin' | 'staff';
  is_active: boolean;
  email_verified: boolean;
  avatar_url: string | null;
  permissions: string[];
  created_at: string;
}

export interface Address {
  id: number;
  label: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// Admin customer types
export interface CustomerListItem {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  orders_count: number;
  total_spent: number;
  city: string | null;
  country: string | null;
}

export interface CustomerOrderSummary {
  id: number;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
}

export interface CustomerDetail {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  email_verified: boolean;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  orders_count: number;
  total_spent: number;
  average_order: number;
  last_order: CustomerOrderSummary | null;
  addresses: Address[];
  recent_orders: CustomerOrderSummary[];
  admin_note: string | null;
}
