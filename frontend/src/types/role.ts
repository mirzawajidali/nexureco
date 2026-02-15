export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  is_active: boolean;
  staff_count: number;
  created_at: string;
}

export interface StaffUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  role_id: number | null;
  role_name: string | null;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export const ADMIN_MODULES = [
  'dashboard',
  'products',
  'categories',
  'collections',
  'orders',
  'customers',
  'coupons',
  'inventory',
  'reviews',
  'content',
  'media',
  'analytics',
  'settings',
  'newsletter',
  'contact_messages',
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number];

export const MODULE_LABELS: Record<AdminModule, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  collections: 'Collections',
  orders: 'Orders',
  customers: 'Customers',
  coupons: 'Coupons',
  inventory: 'Inventory',
  reviews: 'Reviews',
  content: 'Content',
  media: 'Media',
  analytics: 'Analytics',
  settings: 'Settings',
  newsletter: 'Newsletter',
  contact_messages: 'Messages',
};
