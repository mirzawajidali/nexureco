import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { UserIcon, MapPinIcon, ShoppingBagIcon, KeyIcon } from '@heroicons/react/24/outline';
import { APP_NAME } from '@/utils/constants';
import { clsx } from 'clsx';
import AccountProfile from '@/components/account/AccountProfile';
import AccountOrders from '@/components/account/AccountOrders';
import AccountAddresses from '@/components/account/AccountAddresses';
import AccountPassword from '@/components/account/AccountPassword';

const NAV_ITEMS = [
  { path: '/account/profile', label: 'Profile', icon: UserIcon },
  { path: '/account/orders', label: 'Orders', icon: ShoppingBagIcon },
  { path: '/account/addresses', label: 'Addresses', icon: MapPinIcon },
  { path: '/account/password', label: 'Password', icon: KeyIcon },
];

export default function AccountPage() {
  return (
    <>
      <Helmet>
        <title>My Account | {APP_NAME}</title>
      </Helmet>

      <div className="container-custom py-8">
        <h1 className="text-heading-xl font-heading uppercase mb-8">My Account</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-full lg:w-64 flex-shrink-0">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-3 text-sm font-heading font-bold uppercase tracking-wider whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-brand-black text-white'
                        : 'text-gray-500 hover:text-brand-black hover:bg-gray-100'
                    )
                  }
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <Routes>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<AccountProfile />} />
              <Route path="orders" element={<AccountOrders />} />
              <Route path="addresses" element={<AccountAddresses />} />
              <Route path="password" element={<AccountPassword />} />
            </Routes>
          </div>
        </div>
      </div>
    </>
  );
}
