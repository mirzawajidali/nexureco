import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PencilIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { adminCustomersApi } from '@/api/admin.api';
import { formatPrice, formatDate, formatDateTime } from '@/utils/formatters';
import Spinner from '@/components/ui/Spinner';
import type { CustomerDetail } from '@/types/user';

// --- Helpers ---

function statusBadge(status: string) {
  switch (status) {
    case 'delivered':
      return { label: 'Delivered', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
    case 'shipped':
      return { label: 'Shipped', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'cancelled':
      return { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
    case 'returned':
      return { label: 'Returned', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' };
    case 'confirmed':
    case 'processing':
      return { label: status.charAt(0).toUpperCase() + status.slice(1), bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' };
    default:
      return { label: 'Pending', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' };
  }
}

function formatCustomerSince(dateString: string): string {
  const d = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

// --- Component ---

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'customer', id],
    queryFn: () => adminCustomersApi.get(Number(id)),
    enabled: !!id,
  });

  const customer: CustomerDetail | undefined = data?.data;

  const toggleStatusMutation = useMutation({
    mutationFn: () => adminCustomersApi.toggleStatus(Number(id)),
    onSuccess: () => {
      toast.success('Customer status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'customer', id] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminCustomersApi.update(Number(id), data),
    onSuccess: () => {
      toast.success('Customer updated');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'customer', id] });
    },
    onError: () => toast.error('Failed to update customer'),
  });

  function startEditing() {
    if (!customer) return;
    setEditForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone || '',
    });
    setIsEditing(true);
  }

  function handleSave() {
    updateMutation.mutate(editForm);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Customer not found</p>
        <Link to="/admin/customers" className="mt-2 text-sm text-blue-600 hover:underline">
          Back to customers
        </Link>
      </div>
    );
  }

  const defaultAddress = customer.addresses.find((a) => a.is_default) || customer.addresses[0];

  return (
    <>
      <Helmet>
        <title>{customer.first_name} {customer.last_name} | Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/customers')}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-gray-500" />
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="text-sm text-gray-500">{customer.email}</p>
          </div>
          <button
            onClick={() => toggleStatusMutation.mutate()}
            disabled={toggleStatusMutation.isPending}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              customer.is_active
                ? 'border-red-300 text-red-700 hover:bg-red-50'
                : 'border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            {customer.is_active ? 'Disable account' : 'Enable account'}
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Amount spent</p>
                <p className="text-lg font-semibold text-gray-900">{formatPrice(customer.total_spent)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <ShoppingBagIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Orders</p>
                <p className="text-lg font-semibold text-gray-900">{customer.orders_count}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Customer since</p>
                <p className="text-lg font-semibold text-gray-900">{formatCustomerSince(customer.created_at)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Avg order</p>
                <p className="text-lg font-semibold text-gray-900">{formatPrice(customer.average_order)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content: 2-column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Last order */}
            {customer.last_order && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                  <h2 className="text-[13px] font-semibold text-gray-900">Last order placed</h2>
                  <Link
                    to={`/admin/orders/${customer.last_order.id}`}
                    className="text-sm text-blue-600 hover:underline inline-flex items-center gap-0.5"
                  >
                    View order
                    <ChevronRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        to={`/admin/orders/${customer.last_order.id}`}
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        {customer.last_order.order_number}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDateTime(customer.last_order.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatPrice(customer.last_order.total)}
                      </p>
                      {(() => {
                        const badge = statusBadge(customer.last_order.status);
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${badge.bg} ${badge.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent orders */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-[13px] font-semibold text-gray-900">Orders</h2>
              </div>
              {customer.recent_orders.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-500">
                  This customer hasn't placed any orders yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {customer.recent_orders.map((order) => {
                    const badge = statusBadge(order.status);
                    return (
                      <div key={order.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                        <div>
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="text-sm text-blue-600 hover:underline font-medium"
                          >
                            {order.order_number}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                          <span className="text-sm font-medium text-gray-900 min-w-[70px] text-right">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column (sidebar) */}
          <div className="space-y-4">
            {/* Customer info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-[13px] font-semibold text-gray-900">Customer</h2>
                <button
                  onClick={startEditing}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  title="Edit customer"
                >
                  <PencilIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              {isEditing ? (
                <div className="px-5 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">First name</label>
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Last name</label>
                      <input
                        type="text"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-600">
                        {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-xs ${customer.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${customer.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        {customer.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contact information */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-[13px] font-semibold text-gray-900">Contact information</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-start gap-3">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-sm text-blue-600 hover:underline break-all">
                    {customer.email}
                  </a>
                </div>
                {customer.phone && (
                  <div className="flex items-start gap-3">
                    <PhoneIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <a href={`tel:${customer.phone}`} className="text-sm text-blue-600 hover:underline">
                      {customer.phone}
                    </a>
                  </div>
                )}
                {customer.last_login_at && (
                  <p className="text-xs text-gray-500">
                    Last login: {formatDateTime(customer.last_login_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Default address */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-[13px] font-semibold text-gray-900">Default address</h2>
              </div>
              <div className="px-5 py-4">
                {defaultAddress ? (
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-700 space-y-0.5">
                      <p>{defaultAddress.first_name} {defaultAddress.last_name}</p>
                      <p>{defaultAddress.address_line1}</p>
                      {defaultAddress.address_line2 && <p>{defaultAddress.address_line2}</p>}
                      <p>
                        {defaultAddress.city}, {defaultAddress.state} {defaultAddress.postal_code}
                      </p>
                      <p>{defaultAddress.country}</p>
                      {defaultAddress.phone && (
                        <p className="text-gray-500">{defaultAddress.phone}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No address on file</p>
                )}
              </div>
            </div>

            {/* All addresses */}
            {customer.addresses.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200">
                  <h2 className="text-[13px] font-semibold text-gray-900">
                    Other addresses ({customer.addresses.length - 1})
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {customer.addresses
                    .filter((a) => a.id !== defaultAddress?.id)
                    .map((addr) => (
                      <div key={addr.id} className="px-5 py-3">
                        <div className="text-sm text-gray-700 space-y-0.5">
                          <p className="font-medium">{addr.first_name} {addr.last_name}</p>
                          <p className="text-gray-500">
                            {addr.address_line1}, {addr.city}, {addr.state}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Account info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-[13px] font-semibold text-gray-900">Account</h2>
              </div>
              <div className="px-5 py-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Email verified</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${customer.email_verified ? 'text-green-600' : 'text-amber-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${customer.email_verified ? 'bg-green-500' : 'bg-amber-500'}`} />
                    {customer.email_verified ? 'Verified' : 'Not verified'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Account status</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${customer.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${customer.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {customer.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Member since</span>
                  <span className="text-gray-900">{formatDate(customer.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
