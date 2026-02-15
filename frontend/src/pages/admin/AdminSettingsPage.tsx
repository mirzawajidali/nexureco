import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import Spinner from '@/components/ui/Spinner';
import { adminSettingsApi } from '@/api/admin.api';

interface SettingsForm {
  store_name: string;
  store_email: string;
  store_phone: string;
  store_address: string;
  shipping_free_threshold: string;
  shipping_flat_rate: string;
  tax_rate: string;
  currency: string;
  announcement_text: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
}

const DEFAULT_SETTINGS: SettingsForm = {
  store_name: '',
  store_email: '',
  store_phone: '',
  store_address: '',
  shipping_free_threshold: '0',
  shipping_flat_rate: '0',
  tax_rate: '0',
  currency: 'PKR',
  announcement_text: '',
  social_facebook: '',
  social_instagram: '',
  social_twitter: '',
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminSettingsApi.get().then((res) => res.data),
  });

  useEffect(() => {
    if (settings) {
      if (Array.isArray(settings)) {
        const mapped: Record<string, string> = {};
        settings.forEach((s: { key: string; value: string }) => {
          mapped[s.key] = s.value;
        });
        setForm({ ...DEFAULT_SETTINGS, ...mapped });
      } else {
        setForm({ ...DEFAULT_SETTINGS, ...settings });
      }
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => adminSettingsApi.update(data),
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form as unknown as Record<string, string>);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Settings | Admin - My Brand</title>
      </Helmet>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
              Settings
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Configure your store preferences</p>
          </div>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Store Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-4">
            Store details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Store name">
              <input
                name="store_name"
                value={form.store_name}
                onChange={handleChange}
                placeholder="My Brand"
                className={inputClass}
              />
            </Field>
            <Field label="Store email">
              <input
                name="store_email"
                type="email"
                value={form.store_email}
                onChange={handleChange}
                placeholder="info@mybrand.com"
                className={inputClass}
              />
            </Field>
            <Field label="Store phone">
              <input
                name="store_phone"
                value={form.store_phone}
                onChange={handleChange}
                placeholder="+92 300 1234567"
                className={inputClass}
              />
            </Field>
            <Field label="Currency">
              <input
                name="currency"
                value={form.currency}
                onChange={handleChange}
                placeholder="PKR"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Store address">
              <textarea
                name="store_address"
                value={form.store_address}
                onChange={handleChange}
                rows={3}
                className={inputClass + ' resize-none'}
                placeholder="123 Main Street, Lahore, Pakistan"
              />
            </Field>
          </div>
        </div>

        {/* Shipping & Tax */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-4">
            Shipping and tax
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Free shipping threshold" hint="Orders above this amount get free shipping">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rs.</span>
                <input
                  name="shipping_free_threshold"
                  type="number"
                  value={form.shipping_free_threshold}
                  onChange={handleChange}
                  placeholder="5000"
                  className={inputClass + ' pl-10'}
                />
              </div>
            </Field>
            <Field label="Flat rate shipping" hint="Default shipping cost per order">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rs.</span>
                <input
                  name="shipping_flat_rate"
                  type="number"
                  value={form.shipping_flat_rate}
                  onChange={handleChange}
                  placeholder="200"
                  className={inputClass + ' pl-10'}
                />
              </div>
            </Field>
            <Field label="Tax rate" hint="Applied to all orders">
              <div className="relative">
                <input
                  name="tax_rate"
                  type="number"
                  value={form.tax_rate}
                  onChange={handleChange}
                  placeholder="0"
                  className={inputClass + ' pr-8'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
              </div>
            </Field>
          </div>
        </div>

        {/* Announcement Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-4">
            Announcement bar
          </h2>
          <Field label="Announcement text" hint="Leave blank to hide the announcement bar on the storefront">
            <input
              name="announcement_text"
              value={form.announcement_text}
              onChange={handleChange}
              placeholder="Free shipping on orders over Rs. 5,000!"
              className={inputClass}
            />
          </Field>
        </div>

        {/* Social Media */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-4">
            Social media
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Facebook">
              <input
                name="social_facebook"
                value={form.social_facebook}
                onChange={handleChange}
                placeholder="https://facebook.com/mybrand"
                className={inputClass}
              />
            </Field>
            <Field label="Instagram">
              <input
                name="social_instagram"
                value={form.social_instagram}
                onChange={handleChange}
                placeholder="https://instagram.com/mybrand"
                className={inputClass}
              />
            </Field>
            <Field label="Twitter / X">
              <input
                name="social_twitter"
                value={form.social_twitter}
                onChange={handleChange}
                placeholder="https://x.com/mybrand"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </>
  );
}
