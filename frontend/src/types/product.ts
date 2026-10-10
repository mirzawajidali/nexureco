export interface SizeAndFit {
  fit_type?: string;
  model_info?: string;
  size_guide_url?: string;
  details?: string[];
}

export interface CareInstructions {
  washing: { icon?: string; text: string }[];
  extra_care: string[];
}

export interface MaterialInfo {
  composition?: string;
  features?: string[];
}

export interface Product {
  id: number;
  category_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price: number;
  compare_at_price: number | null;
  cost_price?: number | null; // admin API only
  sku: string | null;
  barcode: string | null;
  weight: number | null;
  requires_shipping: boolean;
  status: 'active' | 'draft' | 'archived';
  is_featured: boolean;
  tags: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  size_and_fit: SizeAndFit | null;
  care_instructions: CareInstructions | null;
  material_info: MaterialInfo | null;
  total_sold?: number; // admin API only
  avg_rating: number;
  review_count: number;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  category: Category | null;
  category_name: string | null;
  category_slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  base_price: number;
  compare_at_price: number | null;
  sku: string | null;
  status: 'active' | 'draft' | 'archived';
  is_featured: boolean;
  avg_rating: number;
  review_count: number;
  total_sold?: number; // admin API only
  primary_image: string | null;
  category_name: string | null;
  total_stock?: number; // admin API only
  variant_count: number;
  variant_images: string[];
  // Storefront API: colour name per variant image, stock and badge flags (sales/stock counts stay private)
  variant_colors?: (string | null)[];
  in_stock?: boolean;
  is_best_seller?: boolean;
  tags: string[] | null;
  created_at: string;
}

/** Admin API list item, which also carries sales and stock counts */
export type AdminProductListItem = ProductListItem & { total_sold: number; total_stock: number };

export interface ProductImage {
  id: number;
  url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface ProductOption {
  id: number;
  name: string;
  display_order: number;
  values: ProductOptionValue[];
}

export interface ProductOptionValue {
  id: number;
  value: string;
  display_order: number;
}

export interface ProductVariant {
  id: number;
  sku: string | null;
  price: number | null;
  compare_at_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  image_url: string | null;
  option_values: { option_value_id: number }[];
}

export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  children?: Category[];
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
}

export interface ProductFilters {
  category?: string;
  min_price?: number;
  max_price?: number;
  color?: string;
  size?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
  q?: string;
  page?: number;
  page_size?: number;
  ids?: string;
}
