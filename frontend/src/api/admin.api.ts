import client from './client';

// Dashboard
export const adminDashboardApi = {
  getStats: () => client.get('/admin/dashboard/stats'),
  getLowStock: () => client.get('/admin/dashboard/low-stock'),
};

// Products
export const adminProductsApi = {
  list: (params?: Record<string, unknown>) => client.get('/admin/products/', { params }),
  get: (id: number) => client.get(`/admin/products/${id}`),
  create: (data: Record<string, unknown>) => client.post('/admin/products/', data),
  update: (id: number, data: Record<string, unknown>) => client.put(`/admin/products/${id}`, data),
  delete: (id: number) => client.delete(`/admin/products/${id}`),
  exportCsv: (params?: Record<string, unknown>) =>
    client.get('/admin/products/export', { params, responseType: 'blob' }),
  importCsv: (formData: FormData) =>
    client.post('/admin/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  bulkDelete: (ids: number[]) => client.post('/admin/products/bulk-delete', { ids }),
  uploadImage: (productId: number, formData: FormData) =>
    client.post(`/admin/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  setPrimaryImage: (productId: number, imageId: number) =>
    client.put(`/admin/products/${productId}/images/${imageId}/primary`),
  deleteImage: (productId: number, imageId: number) =>
    client.delete(`/admin/products/${productId}/images/${imageId}`),
};

// Categories
export const adminCategoriesApi = {
  list: () => client.get('/admin/categories/'),
  create: (data: Record<string, unknown>) => client.post('/admin/categories/', data),
  update: (id: number, data: Record<string, unknown>) => client.put(`/admin/categories/${id}`, data),
  delete: (id: number) => client.delete(`/admin/categories/${id}`),
};

// Collections
export const adminCollectionsApi = {
  list: () => client.get('/admin/collections/'),
  get: (id: number) => client.get(`/admin/collections/${id}`),
  create: (data: Record<string, unknown>) => client.post('/admin/collections/', data),
  update: (id: number, data: Record<string, unknown>) => client.put(`/admin/collections/${id}`, data),
  delete: (id: number) => client.delete(`/admin/collections/${id}`),
  addProducts: (id: number, productIds: number[]) =>
    client.post(`/admin/collections/${id}/products`, { product_ids: productIds }),
  removeProduct: (id: number, productId: number) =>
    client.delete(`/admin/collections/${id}/products/${productId}`),
};

// Orders
export const adminOrdersApi = {
  list: (params?: Record<string, unknown>) => client.get('/admin/orders/', { params }),
  get: (id: number) => client.get(`/admin/orders/${id}`),
  create: (data: Record<string, unknown>) => client.post('/admin/orders/create', data),
  stats: () => client.get('/admin/orders/stats'),
  exportCsv: (params?: Record<string, unknown>) =>
    client.get('/admin/orders/export', { params, responseType: 'blob' }),
  updateStatus: (id: number, data: { status: string; note?: string }) =>
    client.put(`/admin/orders/${id}/status`, data),
  updateTracking: (id: number, data: { tracking_number: string; tracking_url?: string }) =>
    client.put(`/admin/orders/${id}/tracking`, data),
  markPaid: (id: number) => client.put(`/admin/orders/${id}/mark-paid`),
  updateNote: (id: number, data: { admin_note: string }) =>
    client.put(`/admin/orders/${id}/note`, data),
};

// Customers
export const adminCustomersApi = {
  list: (params?: Record<string, unknown>) => client.get('/admin/customers/', { params }),
  get: (id: number) => client.get(`/admin/customers/${id}`),
  create: (data: Record<string, unknown>) => client.post('/admin/customers/', data),
  update: (id: number, data: Record<string, unknown>) => client.put(`/admin/customers/${id}`, data),
  toggleStatus: (id: number) => client.put(`/admin/customers/${id}/toggle-status`),
};

// Coupons
export const adminCouponsApi = {
  list: (params?: Record<string, unknown>) => client.get('/admin/coupons/', { params }),
  get: (id: number) => client.get(`/admin/coupons/${id}`),
  create: (data: Record<string, unknown>) => client.post('/admin/coupons/', data),
  update: (id: number, data: Record<string, unknown>) => client.put(`/admin/coupons/${id}`, data),
  delete: (id: number) => client.delete(`/admin/coupons/${id}`),
};

// Inventory
export const adminInventoryApi = {
  list: (params?: Record<string, unknown>) => client.get('/admin/inventory/', { params }),
  adjust: (variantId: number, data: { quantity_change: number; reason: string; note?: string }) =>
    client.put(`/admin/inventory/${variantId}/adjust`, data),
};

// Reviews
export const adminReviewsApi = {
  list: (params?: Record<string, unknown>) => client.get('/admin/reviews/', { params }),
  approve: (id: number) => client.put(`/admin/reviews/${id}/approve`),
  reject: (id: number) => client.put(`/admin/reviews/${id}/reject`),
  delete: (id: number) => client.delete(`/admin/reviews/${id}`),
};

// Content - Banners & Pages
export const adminBannersApi = {
  list: () => client.get('/admin/content/banners/'),
  create: (data: Record<string, unknown>) => client.post('/admin/content/banners/', data),
  update: (id: number, data: Record<string, unknown>) => client.put(`/admin/content/banners/${id}`, data),
  delete: (id: number) => client.delete(`/admin/content/banners/${id}`),
};

export const adminPagesApi = {
  list: () => client.get('/admin/content/pages/'),
  create: (data: Record<string, unknown>) => client.post('/admin/content/pages/', data),
  update: (id: number, data: Record<string, unknown>) => client.put(`/admin/content/pages/${id}`, data),
  delete: (id: number) => client.delete(`/admin/content/pages/${id}`),
};

// Settings
export const adminSettingsApi = {
  get: () => client.get('/admin/settings/'),
  update: (data: Record<string, string>) => client.put('/admin/settings/', data),
};

// Analytics
export const adminAnalyticsApi = {
  dashboard: (period?: string) => client.get('/admin/analytics/dashboard', { params: { period } }),
  sales: () => client.get('/admin/analytics/sales'),
  topProducts: () => client.get('/admin/analytics/top-products'),
  customers: () => client.get('/admin/analytics/customers'),
};

// Media
export const adminMediaApi = {
  list: (params?: Record<string, unknown>) => client.get('/admin/media/', { params }),
  get: (id: number) => client.get(`/admin/media/${id}`),
  upload: (formData: FormData) =>
    client.post('/admin/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, data: { alt_text?: string }) =>
    client.put(`/admin/media/${id}`, null, { params: data }),
  delete: (id: number) => client.delete(`/admin/media/${id}`),
};

// Newsletter
export const adminNewsletterApi = {
  list: (params?: Record<string, unknown>) => client.get('/admin/newsletter/', { params }),
  exportCsv: () => client.get('/admin/newsletter/export', { responseType: 'text' }),
};

// Contact Messages
export const adminContactApi = {
  list: (params?: Record<string, unknown>) => client.get('/admin/contact-messages/', { params }),
  get: (id: number) => client.get(`/admin/contact-messages/${id}`),
  reply: (id: number, reply: string) => client.put(`/admin/contact-messages/${id}/reply`, { reply }),
  delete: (id: number) => client.delete(`/admin/contact-messages/${id}`),
};

// Notifications
export const adminNotificationsApi = {
  get: () => client.get('/admin/notifications/'),
};

// Search
export const adminSearchApi = {
  search: (q: string) => client.get('/admin/search/', { params: { q } }),
};

// Roles
export const adminRolesApi = {
  list: () => client.get('/admin/roles/'),
  get: (id: number) => client.get(`/admin/roles/${id}`),
  create: (data: { name: string; description?: string; permissions: string[] }) =>
    client.post('/admin/roles/', data),
  update: (id: number, data: { name?: string; description?: string; permissions?: string[]; is_active?: boolean }) =>
    client.put(`/admin/roles/${id}`, data),
  delete: (id: number) => client.delete(`/admin/roles/${id}`),
  getModules: () => client.get('/admin/roles/modules'),
};

// Staff
export const adminStaffApi = {
  list: (params?: Record<string, unknown>) => client.get('/admin/staff/', { params }),
  get: (id: number) => client.get(`/admin/staff/${id}`),
  create: (data: { email: string; password: string; first_name: string; last_name: string; phone?: string; role_id: number }) =>
    client.post('/admin/staff/', data),
  update: (id: number, data: { first_name?: string; last_name?: string; phone?: string; role_id?: number; is_active?: boolean }) =>
    client.put(`/admin/staff/${id}`, data),
  delete: (id: number) => client.delete(`/admin/staff/${id}`),
};

// Menus
export const adminMenusApi = {
  list: () => client.get('/admin/content/menus/'),
  get: (id: number) => client.get(`/admin/content/menus/${id}`),
  create: (data: Record<string, unknown>) => client.post('/admin/content/menus/', data),
  update: (id: number, data: Record<string, unknown>) => client.put(`/admin/content/menus/${id}`, data),
  delete: (id: number) => client.delete(`/admin/content/menus/${id}`),
  createItem: (menuId: number, data: Record<string, unknown>) =>
    client.post(`/admin/content/menus/${menuId}/items`, data),
  updateItem: (itemId: number, data: Record<string, unknown>) =>
    client.put(`/admin/content/menus/items/${itemId}`, data),
  deleteItem: (itemId: number) => client.delete(`/admin/content/menus/items/${itemId}`),
  reorder: (menuId: number, items: { id: number; display_order: number }[]) =>
    client.put(`/admin/content/menus/${menuId}/reorder`, { items }),
};
