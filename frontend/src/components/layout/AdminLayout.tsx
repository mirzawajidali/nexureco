import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HomeIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  TicketIcon,
  StarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import BrandLogo from '@/components/ui/BrandLogo';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { adminNotificationsApi } from '@/api/admin.api';
import { formatPrice } from '@/utils/formatters';
import AdminSearchModal from '@/components/admin/AdminSearchModal';
import { clsx } from 'clsx';

// --- Relative time helper ---

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
}

// --- Navigation structure (Shopify-style grouped) ---

interface NavItem {
  label: string;
  href: string;
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;
  module?: string;
  children?: { label: string; href: string; module?: string }[];
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Home', href: '/admin', icon: HomeIcon, module: 'dashboard' },
  { label: 'Orders', href: '/admin/orders', icon: ClipboardDocumentListIcon, module: 'orders' },
  {
    label: 'Products',
    href: '/admin/products',
    icon: ShoppingBagIcon,
    module: 'products',
    children: [
      { label: 'Collections', href: '/admin/collections', module: 'collections' },
      { label: 'Inventory', href: '/admin/inventory', module: 'inventory' },
      { label: 'Categories', href: '/admin/categories', module: 'categories' },
    ],
  },
  { label: 'Customers', href: '/admin/customers', icon: UsersIcon, module: 'customers' },
];

const ADMIN_NAV_SECONDARY: NavItem[] = [
  { label: 'Content', href: '/admin/pages', icon: DocumentTextIcon, module: 'content',
    children: [
      { label: 'Banners', href: '/admin/banners', module: 'content' },
      { label: 'Menus', href: '/admin/menus', module: 'content' },
      { label: 'Files', href: '/admin/media', module: 'media' },
    ],
  },
  { label: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon, module: 'analytics' },
  { label: 'Discounts', href: '/admin/coupons', icon: TicketIcon, module: 'coupons' },
  { label: 'Reviews', href: '/admin/reviews', icon: StarIcon, module: 'reviews' },
  { label: 'Messages', href: '/admin/contact-messages', icon: ChatBubbleLeftRightIcon, module: 'contact_messages' },
  { label: 'Newsletter', href: '/admin/newsletter', icon: MegaphoneIcon, module: 'newsletter' },
];

// --- Sidebar NavItem component ---

function SideNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const isHome = item.href === '/admin';
  const isExact = isHome ? pathname === '/admin' : pathname === item.href;
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.href));
  const isActive = isHome
    ? isExact
    : isExact || pathname.startsWith(item.href + '/') || !!isChildActive;

  return (
    <div>
      <Link
        to={item.href}
        className={clsx(
          'flex items-center gap-3 px-3 py-2 text-sm rounded-lg mx-2 transition-colors',
          isActive
            ? 'bg-white/10 text-white font-medium'
            : 'text-gray-400 hover:text-white hover:bg-white/5',
        )}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {item.label}
      </Link>
      {/* Sub-items (always visible when parent is active) */}
      {item.children && isActive && (
        <div className="ml-10 mt-0.5 space-y-0.5">
          {item.children.map((child) => {
            const childActive = pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                to={child.href}
                className={clsx(
                  'block px-3 py-1.5 text-sm rounded-lg transition-colors',
                  childActive
                    ? 'text-white font-medium'
                    : 'text-gray-500 hover:text-white',
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Notification Dropdown ---

interface NotificationOrder {
  id: number;
  order_number: string;
  total: number;
  status: string;
  customer_name: string;
  created_at: string;
}

interface NotificationSub {
  id: number;
  email: string;
  subscribed_at: string;
}

interface NotificationsData {
  orders: NotificationOrder[];
  newsletter: NotificationSub[];
  orders_today: number;
  newsletter_today: number;
}

function NotificationDropdown({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'orders' | 'newsletter'>('orders');

  const { data } = useQuery<NotificationsData>({
    queryKey: ['admin', 'notifications'],
    queryFn: () => adminNotificationsApi.get().then((res) => res.data),
    refetchInterval: 30000,
  });

  if (!open) return null;

  const orders = data?.orders ?? [];
  const newsletter = data?.newsletter ?? [];
  const ordersToday = data?.orders_today ?? 0;
  const newsletterToday = data?.newsletter_today ?? 0;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Notifications</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('orders')}
            className={clsx(
              'flex-1 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors',
              tab === 'orders'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            Orders
            {ordersToday > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
                {ordersToday}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('newsletter')}
            className={clsx(
              'flex-1 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors',
              tab === 'newsletter'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            Newsletter
            {newsletterToday > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                {newsletterToday}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {tab === 'orders' ? (
            orders.length === 0 ? (
              <div className="py-10 text-center">
                <ClipboardDocumentListIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No recent orders</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/admin/orders/${order.id}`}
                    onClick={onClose}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        #{order.order_number}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {order.customer_name} &middot; {formatPrice(order.total)}
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 ml-3">
                      {order.created_at ? timeAgo(order.created_at) : ''}
                    </span>
                  </Link>
                ))}
              </div>
            )
          ) : newsletter.length === 0 ? (
            <div className="py-10 text-center">
              <EnvelopeIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No recent subscribers</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {newsletter.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {sub.email}
                    </p>
                    <p className="text-xs text-gray-500">New subscriber</p>
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0 ml-3">
                    {sub.subscribed_at ? timeAgo(sub.subscribed_at) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2.5">
          <Link
            to={tab === 'orders' ? '/admin/orders' : '/admin/newsletter'}
            onClick={onClose}
            className="block text-center text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            View all {tab === 'orders' ? 'orders' : 'subscribers'}
          </Link>
        </div>
      </div>
    </>
  );
}

// --- Main Layout ---

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isAdmin, hasModule } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Filter nav items based on permissions
  const filterNav = (items: NavItem[]): NavItem[] => {
    return items
      .filter((item) => !item.module || hasModule(item.module))
      .map((item) => {
        if (!item.children) return item;
        const filteredChildren = item.children.filter(
          (child) => !child.module || hasModule(child.module)
        );
        return { ...item, children: filteredChildren.length > 0 ? filteredChildren : undefined };
      });
  };

  const filteredPrimary = filterNav(ADMIN_NAV);
  const filteredSecondary = filterNav(ADMIN_NAV_SECONDARY);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Ctrl+K to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: notifData } = useQuery<NotificationsData>({
    queryKey: ['admin', 'notifications'],
    queryFn: () => adminNotificationsApi.get().then((res) => res.data),
    refetchInterval: 30000,
  });

  const totalBadge = (notifData?.orders_today ?? 0) + (notifData?.newsletter_today ?? 0);

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'A'
    : 'A';

  function handleLogout() {
    logout();
    navigate('/');
  }

  // Sidebar content (reused for mobile drawer)
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 h-14 px-4">
        <BrandLogo size="sm" variant="light" linkTo="/admin" />
      </div>

      {/* Primary Nav */}
      <nav className="flex-1 py-2 overflow-y-auto space-y-0.5">
        {filteredPrimary.map((item) => (
          <SideNavItem key={item.href} item={item} pathname={location.pathname} />
        ))}

        {/* Divider */}
        {filteredSecondary.length > 0 && (
          <div className="my-3 mx-4 border-t border-gray-800" />
        )}

        {filteredSecondary.map((item) => (
          <SideNavItem key={item.href} item={item} pathname={location.pathname} />
        ))}

        {/* Staff Management (superadmin only) */}
        {isAdmin && (
          <>
            <div className="my-3 mx-4 border-t border-gray-800" />
            <SideNavItem
              item={{ label: 'Staff', href: '/admin/staff', icon: UserGroupIcon, children: [{ label: 'Roles', href: '/admin/roles' }] }}
              pathname={location.pathname}
            />
          </>
        )}
      </nav>

      {/* Settings at bottom */}
      {hasModule('settings') && (
        <div className="border-t border-gray-800 py-2">
          <Link
            to="/admin/settings"
            className={clsx(
              'flex items-center gap-3 px-3 py-2 text-sm rounded-lg mx-2 transition-colors',
              location.pathname.startsWith('/admin/settings')
                ? 'bg-white/10 text-white font-medium'
                : 'text-gray-400 hover:text-white hover:bg-white/5',
            )}
          >
            <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
            Settings
          </Link>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-[#1a1a1a] text-white fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-[260px] bg-[#1a1a1a] text-white flex flex-col z-50">
            <div className="flex items-center justify-between px-4 h-14">
              <BrandLogo size="sm" variant="light" linkTo="/admin" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 py-2 overflow-y-auto space-y-0.5">
              {filteredPrimary.map((item) => (
                <SideNavItem key={item.href} item={item} pathname={location.pathname} />
              ))}
              {filteredSecondary.length > 0 && (
                <div className="my-3 mx-4 border-t border-gray-800" />
              )}
              {filteredSecondary.map((item) => (
                <SideNavItem key={item.href} item={item} pathname={location.pathname} />
              ))}
              {isAdmin && (
                <>
                  <div className="my-3 mx-4 border-t border-gray-800" />
                  <SideNavItem
                    item={{ label: 'Staff', href: '/admin/staff', icon: UserGroupIcon, children: [{ label: 'Roles', href: '/admin/roles' }] }}
                    pathname={location.pathname}
                  />
                </>
              )}
            </nav>
            {hasModule('settings') && (
              <div className="border-t border-gray-800 py-2">
                <Link
                  to="/admin/settings"
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg mx-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                  Settings
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-[260px]">
        {/* Top Bar */}
        <header className="bg-[#1a1a1a] h-14 flex items-center px-4 sticky top-0 z-20">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white mr-3"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          {/* Search bar trigger (opens modal, Shopify-style) */}
          <div className="flex-1 flex justify-center max-w-2xl mx-auto">
            <button
              onClick={() => setSearchOpen(true)}
              className="relative w-full max-w-lg flex items-center bg-[#303030] text-gray-500 text-sm pl-9 pr-16 py-2 rounded-lg border border-transparent hover:border-gray-600 hover:bg-[#3a3a3a] transition-all cursor-pointer"
            >
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              Search
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-500 bg-[#404040] px-1.5 py-0.5 rounded font-mono">
                Ctrl K
              </span>
            </button>
          </div>

          {/* Right side: notifications + profile */}
          <div className="flex items-center gap-1 ml-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors relative"
              >
                <BellIcon className="h-5 w-5" />
                {totalBadge > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {totalBadge > 99 ? '99+' : totalBadge}
                  </span>
                )}
              </button>

              <NotificationDropdown
                open={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
              />
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      to="/"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      View store
                    </Link>
                    <Link
                      to="/admin/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      Settings
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>

      {/* Search Modal */}
      <AdminSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
