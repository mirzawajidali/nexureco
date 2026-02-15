import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeftIcon, UsersIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { adminCustomersApi } from '@/api/admin.api';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  note: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const INITIAL_FORM: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  note: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'Pakistan',
};

export default function AdminCustomerFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [showAddress, setShowAddress] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminCustomersApi.create(data),
    onSuccess: (res) => {
      toast.success('Customer created');
      navigate(`/admin/customers/${res.data.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Failed to create customer';
      toast.error(msg);
    },
  });

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.email.trim()) {
      toast.error('First name and email are required');
      return;
    }

    const payload: Record<string, unknown> = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
    };
    if (form.phone) payload.phone = form.phone;
    if (form.note) payload.note = form.note;
    if (showAddress && form.address_line1) {
      payload.address_line1 = form.address_line1;
      payload.address_line2 = form.address_line2 || undefined;
      payload.city = form.city;
      payload.state = form.state;
      payload.postal_code = form.postal_code;
      payload.country = form.country;
    }

    createMutation.mutate(payload);
  }

  return (
    <>
      <Helmet>
        <title>New customer | Admin</title>
      </Helmet>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/customers')}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 flex-1 flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-gray-500" />
            New customer
          </h1>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {createMutation.isPending ? 'Saving...' : 'Save customer'}
          </button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer overview */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-[13px] font-semibold text-gray-900">Customer overview</h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      First name
                    </label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone number
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+92"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Default address */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h2 className="text-[13px] font-semibold text-gray-900">Default address</h2>
              </div>
              <div className="px-5 py-4">
                {!showAddress ? (
                  <button
                    type="button"
                    onClick={() => setShowAddress(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Add address
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Address
                      </label>
                      <input
                        type="text"
                        value={form.address_line1}
                        onChange={(e) => handleChange('address_line1', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Apartment, suite, etc.
                      </label>
                      <input
                        type="text"
                        value={form.address_line2}
                        onChange={(e) => handleChange('address_line2', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          City
                        </label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => handleChange('city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Province / State
                        </label>
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) => handleChange('state', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Postal code
                        </label>
                        <input
                          type="text"
                          value={form.postal_code}
                          onChange={(e) => handleChange('postal_code', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Country
                        </label>
                        <input
                          type="text"
                          value={form.country}
                          onChange={(e) => handleChange('country', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddress(false);
                        setForm((prev) => ({
                          ...prev,
                          address_line1: '',
                          address_line2: '',
                          city: '',
                          state: '',
                          postal_code: '',
                          country: 'Pakistan',
                        }));
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove address
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column (sidebar) */}
          <div className="space-y-4">
            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-[13px] font-semibold text-gray-900">Notes</h2>
              </div>
              <div className="px-5 py-4">
                <textarea
                  value={form.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder="Add a note about this customer..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
