import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import ModuleRoute from './ModuleRoute';
import Spinner from '@/components/ui/Spinner';

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );
}

function Lazy({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

// Helper: wrap element with ModuleRoute
function M({ module, component: C }: { module: string; component: React.ComponentType }) {
  return (
    <ModuleRoute module={module}>
      <Lazy component={C} />
    </ModuleRoute>
  );
}

// Storefront Pages (lazy)
const HomePage = lazy(() => import('@/pages/storefront/HomePage'));
const LoginPage = lazy(() => import('@/pages/storefront/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/storefront/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/storefront/ForgotPasswordPage'));
const CategoryPage = lazy(() => import('@/pages/storefront/CategoryPage'));
const CollectionPage = lazy(() => import('@/pages/storefront/CollectionPage'));
const ProductPage = lazy(() => import('@/pages/storefront/ProductPage'));
const SearchPage = lazy(() => import('@/pages/storefront/SearchPage'));
const CartPage = lazy(() => import('@/pages/storefront/CartPage'));
const WishlistPage = lazy(() => import('@/pages/storefront/WishlistPage'));
const CheckoutPage = lazy(() => import('@/pages/storefront/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('@/pages/storefront/OrderConfirmationPage'));
const OrderTrackingPage = lazy(() => import('@/pages/storefront/OrderTrackingPage'));
const AccountPage = lazy(() => import('@/pages/storefront/AccountPage'));
const ContactPage = lazy(() => import('@/pages/storefront/ContactPage'));
const ContentPage = lazy(() => import('@/pages/storefront/ContentPage'));
const NotFoundPage = lazy(() => import('@/pages/storefront/NotFoundPage'));

// Admin Pages (lazy)
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('@/pages/admin/AdminProductsPage'));
const AdminProductFormPage = lazy(() => import('@/pages/admin/AdminProductFormPage'));
const AdminCategoriesPage = lazy(() => import('@/pages/admin/AdminCategoriesPage'));
const AdminCollectionsPage = lazy(() => import('@/pages/admin/AdminCollectionsPage'));
const AdminCollectionFormPage = lazy(() => import('@/pages/admin/AdminCollectionFormPage'));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('@/pages/admin/AdminOrderDetailPage'));
const AdminCreateOrderPage = lazy(() => import('@/pages/admin/AdminCreateOrderPage'));
const AdminCustomersPage = lazy(() => import('@/pages/admin/AdminCustomersPage'));
const AdminCustomerDetailPage = lazy(() => import('@/pages/admin/AdminCustomerDetailPage'));
const AdminCustomerFormPage = lazy(() => import('@/pages/admin/AdminCustomerFormPage'));
const AdminCouponsPage = lazy(() => import('@/pages/admin/AdminCouponsPage'));
const AdminDiscountFormPage = lazy(() => import('@/pages/admin/AdminDiscountFormPage'));
const AdminInventoryPage = lazy(() => import('@/pages/admin/AdminInventoryPage'));
const AdminReviewsPage = lazy(() => import('@/pages/admin/AdminReviewsPage'));
const AdminBannersPage = lazy(() => import('@/pages/admin/AdminBannersPage'));
const AdminPagesPage = lazy(() => import('@/pages/admin/AdminPagesPage'));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));
const AdminMediaPage = lazy(() => import('@/pages/admin/AdminMediaPage'));
const AdminNewsletterPage = lazy(() => import('@/pages/admin/AdminNewsletterPage'));
const AdminContactMessagesPage = lazy(() => import('@/pages/admin/AdminContactMessagesPage'));
const AdminMenusPage = lazy(() => import('@/pages/admin/AdminMenusPage'));
const AdminRolesPage = lazy(() => import('@/pages/admin/AdminRolesPage'));
const AdminStaffPage = lazy(() => import('@/pages/admin/AdminStaffPage'));

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Lazy component={HomePage} /> },
      { path: '/login', element: <Lazy component={LoginPage} /> },
      { path: '/register', element: <Lazy component={RegisterPage} /> },
      { path: '/forgot-password', element: <Lazy component={ForgotPasswordPage} /> },

      // Catalog
      { path: '/category/:slug', element: <Lazy component={CategoryPage} /> },
      { path: '/collections/:slug', element: <Lazy component={CollectionPage} /> },
      { path: '/product/:slug', element: <Lazy component={ProductPage} /> },
      { path: '/search', element: <Lazy component={SearchPage} /> },

      // Cart & Checkout
      { path: '/cart', element: <Lazy component={CartPage} /> },
      { path: '/wishlist', element: <Lazy component={WishlistPage} /> },
      { path: '/checkout', element: <Lazy component={CheckoutPage} /> },
      { path: '/order-confirmation/:orderNumber', element: <Lazy component={OrderConfirmationPage} /> },
      { path: '/track-order', element: <Lazy component={OrderTrackingPage} /> },
      { path: '/track-order/:orderNumber', element: <Lazy component={OrderTrackingPage} /> },

      // Account
      {
        path: '/account/*',
        element: <ProtectedRoute><Lazy component={AccountPage} /></ProtectedRoute>,
      },

      // Contact & CMS Pages
      { path: '/contact', element: <Lazy component={ContactPage} /> },
      { path: '/page/:slug', element: <Lazy component={ContentPage} /> },

      { path: '*', element: <Lazy component={NotFoundPage} /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      { index: true, element: <M module="dashboard" component={AdminDashboardPage} /> },

      // Products
      { path: 'products', element: <M module="products" component={AdminProductsPage} /> },
      { path: 'products/new', element: <M module="products" component={AdminProductFormPage} /> },
      { path: 'products/:id', element: <M module="products" component={AdminProductFormPage} /> },

      // Catalog
      { path: 'categories', element: <M module="categories" component={AdminCategoriesPage} /> },
      { path: 'collections', element: <M module="collections" component={AdminCollectionsPage} /> },
      { path: 'collections/new', element: <M module="collections" component={AdminCollectionFormPage} /> },
      { path: 'collections/:id', element: <M module="collections" component={AdminCollectionFormPage} /> },

      // Orders & Customers
      { path: 'orders', element: <M module="orders" component={AdminOrdersPage} /> },
      { path: 'orders/new', element: <M module="orders" component={AdminCreateOrderPage} /> },
      { path: 'orders/:id', element: <M module="orders" component={AdminOrderDetailPage} /> },
      { path: 'customers', element: <M module="customers" component={AdminCustomersPage} /> },
      { path: 'customers/new', element: <M module="customers" component={AdminCustomerFormPage} /> },
      { path: 'customers/:id', element: <M module="customers" component={AdminCustomerDetailPage} /> },

      // Marketing
      { path: 'coupons', element: <M module="coupons" component={AdminCouponsPage} /> },
      { path: 'coupons/new', element: <M module="coupons" component={AdminDiscountFormPage} /> },
      { path: 'coupons/:id', element: <M module="coupons" component={AdminDiscountFormPage} /> },

      // Inventory & Reviews
      { path: 'inventory', element: <M module="inventory" component={AdminInventoryPage} /> },
      { path: 'reviews', element: <M module="reviews" component={AdminReviewsPage} /> },

      // Content & Media
      { path: 'media', element: <M module="media" component={AdminMediaPage} /> },
      { path: 'banners', element: <M module="content" component={AdminBannersPage} /> },
      { path: 'menus', element: <M module="content" component={AdminMenusPage} /> },
      { path: 'pages', element: <M module="content" component={AdminPagesPage} /> },

      // Contact Messages
      { path: 'contact-messages', element: <M module="contact_messages" component={AdminContactMessagesPage} /> },

      // Analytics & Settings
      { path: 'analytics', element: <M module="analytics" component={AdminAnalyticsPage} /> },
      { path: 'settings', element: <M module="settings" component={AdminSettingsPage} /> },
      { path: 'newsletter', element: <M module="newsletter" component={AdminNewsletterPage} /> },

      // Staff Management (admin-only, no ModuleRoute needed — AdminRoute + backend handles it)
      { path: 'roles', element: <Lazy component={AdminRolesPage} /> },
      { path: 'staff', element: <Lazy component={AdminStaffPage} /> },
    ],
  },
]);
