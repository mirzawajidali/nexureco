import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import Spinner from '@/components/ui/Spinner';
import { adminSettingsApi } from '@/api/admin.api';
import { apiErrorDetail } from '@/api/client';
import { SITE_NAME, SOCIAL_PROFILES, STORE_ADDRESS, STORE_EMAIL, STORE_HOURS, STORE_PHONE } from '@/utils/constants';
import { formatPrice } from '@/utils/formatters';

// Only these settings exist: checkout, the cart and checkout totals, the top bar, the free-shipping bar
// and the server-rendered pages all use them (backend store_settings_service.py)
interface SettingsForm {
  checkout_free_shipping_from: string;
  checkout_shipping_charge: string;
  top_bar_announcement: string;
}

const EMPTY: SettingsForm = { checkout_free_shipping_from: '', checkout_shipping_charge: '', top_bar_announcement: '' };

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1.5">{hint}</p>}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsForm>(EMPTY);

  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminSettingsApi.get().then((res) => res.data as Record<string, string | number>),
  });

  useEffect(() => {
    if (settings) {
      setForm({
        checkout_free_shipping_from: String(settings.checkout_free_shipping_from ?? ''),
        checkout_shipping_charge: String(settings.checkout_shipping_charge ?? ''),
        top_bar_announcement: String(settings.top_bar_announcement ?? ''),
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => adminSettingsApi.update(data),
    onSuccess: () => {
      toast.success('Settings saved. The shop uses them right away.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['store', 'settings'] });
    },
    onError: (err: unknown) => toast.error(apiErrorDetail(err) ?? 'Failed to save settings'),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Never save over the real values with an empty form (e.g. after a failed load)
    if (!settings) return;
    updateMutation.mutate({ ...form });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-center">
        <p className="text-sm text-gray-700">Couldn’t load the settings, so nothing can be saved right now.</p>
        <button onClick={() => refetch()} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800">
          Try again
        </button>
      </div>
    );
  }

  const threshold = Number(form.checkout_free_shipping_from) || 0;
  const rate = Number(form.checkout_shipping_charge) || 0;

  return (
    <>
      <Helmet>
        <title>Settings | Nexure CO Admin</title>
      </Helmet>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
              Settings
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Shipping and the announcement bar apply to the shop as soon as you save</p>
          </div>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Shipping */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Shipping</h2>
          <p className="text-xs text-gray-500 mb-4">
            Checkout charges by these, and the cart, checkout, top bar and product pages show them. Currently:{' '}
            {rate > 0 ? `${formatPrice(rate)} per order, ` : 'free on every order, '}
            {rate > 0 && (threshold > 0 ? `free from ${formatPrice(threshold)}` : 'never free')}.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field id="checkout_free_shipping_from" label="Free shipping from" hint="Order subtotal (before discounts) that ships free">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rs.</span>
                <input
                  id="checkout_free_shipping_from"
                  name="checkout_free_shipping_from"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={form.checkout_free_shipping_from}
                  onChange={handleChange}
                  className={inputClass + ' pl-10'}
                />
              </div>
            </Field>
            <Field id="checkout_shipping_charge" label="Shipping charge" hint="Charged on orders below that amount (0 = always free)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Rs.</span>
                <input
                  id="checkout_shipping_charge"
                  name="checkout_shipping_charge"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={form.checkout_shipping_charge}
                  onChange={handleChange}
                  className={inputClass + ' pl-10'}
                />
              </div>
            </Field>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-4">
            The Shipping &amp; Returns and FAQ pages state these amounts in their own text: update them in Content → Pages
            when you change shipping.
          </p>
        </div>

        {/* Announcement Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-4">Announcement bar</h2>
          <Field
            id="top_bar_announcement"
            label="Announcement text"
            hint="The black bar at the top of every page. Leave blank to show the free-shipping message."
          >
            <input
              id="top_bar_announcement"
              name="top_bar_announcement"
              maxLength={200}
              value={form.top_bar_announcement}
              onChange={handleChange}
              placeholder={`Free shipping on orders of ${formatPrice(threshold || 0)} or more`}
              className={inputClass}
            />
          </Field>
        </div>

        {/* Store details: shown for reference; they're part of the site's code */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-[15px] font-semibold text-gray-900 mb-1">Store details</h2>
          <p className="text-xs text-gray-500 mb-4">
            Shown in the footer, contact page, emails and search results. These are set in the site’s code
            (frontend/src/utils/constants.ts and backend/app/core/store.py); ask your developer to change them.
          </p>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Store name', SITE_NAME],
              ['Email', STORE_EMAIL],
              ['Phone', STORE_PHONE],
              ['Hours', STORE_HOURS],
              ['Address', STORE_ADDRESS],
              ['Social', SOCIAL_PROFILES.join(', ')],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="text-gray-900 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </form>
    </>
  );
}
