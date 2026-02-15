import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, TicketIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { adminCouponsApi } from '@/api/admin.api';
import { APP_NAME } from '@/utils/constants';
import type { Coupon } from '@/types/coupon';

// --- Component ---

export default function AdminDiscountFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const discountContext = searchParams.get('type') ?? 'order';

  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [hasMinOrder, setHasMinOrder] = useState(false);
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [usagePerCustomer, setUsagePerCustomer] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  // Delete confirmation
  const [showDelete, setShowDelete] = useState(false);

  // --- Load existing ---

  const { data: coupon, isLoading } = useQuery({
    queryKey: ['admin', 'coupon', id],
    queryFn: () => adminCouponsApi.get(Number(id)).then((r) => r.data as Coupon),
    enabled: isEdit,
  });

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code);
      setDescription(coupon.description ?? '');
      setType(coupon.type);
      setValue(String(coupon.value));
      if (coupon.min_order_amount && coupon.min_order_amount > 0) {
        setHasMinOrder(true);
        setMinOrderAmount(String(coupon.min_order_amount));
      }
      setMaxDiscount(coupon.max_discount ? String(coupon.max_discount) : '');
      setUsageLimit(coupon.usage_limit ? String(coupon.usage_limit) : '');
      setUsagePerCustomer(String(coupon.usage_per_customer));
      setIsActive(coupon.is_active);
      setStartsAt(coupon.starts_at ? coupon.starts_at.slice(0, 16) : '');
      setExpiresAt(coupon.expires_at ? coupon.expires_at.slice(0, 16) : '');
    }
  }, [coupon]);

  // --- Generate random code ---

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
  }

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminCouponsApi.create(data),
    onSuccess: () => {
      toast.success('Discount created');
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      navigate('/admin/coupons');
    },
    onError: () => toast.error('Failed to create discount'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      adminCouponsApi.update(Number(id), data),
    onSuccess: () => {
      toast.success('Discount updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupon', id] });
      navigate('/admin/coupons');
    },
    onError: () => toast.error('Failed to update discount'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminCouponsApi.delete(Number(id)),
    onSuccess: () => {
      toast.success('Discount deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      navigate('/admin/coupons');
    },
    onError: () => toast.error('Failed to delete discount'),
  });

  // --- Save ---

  function handleSave() {
    if (!code.trim()) {
      toast.error('Discount code is required');
      return;
    }
    if (!value || parseFloat(value) <= 0) {
      toast.error('Discount value is required');
      return;
    }

    const payload: Record<string, unknown> = {
      code: code.toUpperCase().trim(),
      description: description.trim() || null,
      type,
      value: parseFloat(value),
      min_order_amount: hasMinOrder && minOrderAmount ? parseFloat(minOrderAmount) : 0,
      max_discount: type === 'percentage' && maxDiscount ? parseFloat(maxDiscount) : null,
      usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
      usage_per_customer: parseInt(usagePerCustomer, 10) || 1,
      is_active: isActive,
      starts_at: startsAt || null,
      expires_at: expiresAt || null,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // --- Title ---

  const pageTitle = isEdit
    ? code || 'Edit discount'
    : discountContext === 'products'
      ? 'Amount off products'
      : 'Amount off order';

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle} | {APP_NAME} Admin</title>
      </Helmet>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/coupons')}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-gray-500" />
            {pageTitle}
          </h1>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Discount code card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Discount code
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SAVE20"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={generateCode}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Generate random code
                  </button>
                  <p className="text-xs text-gray-400">
                    Customers must enter this code at checkout.
                  </p>
                </div>
              </div>
            </div>

            {/* Discount value card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Discount value
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'percentage' | 'fixed_amount')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {type === 'percentage' ? 'Discount (%)' : 'Discount (Rs.)'}
                  </label>
                  <div className="relative">
                    {type === 'fixed_amount' && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        Rs
                      </span>
                    )}
                    <input
                      type="number"
                      min="0"
                      step={type === 'percentage' ? '1' : '0.01'}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className={`w-full border border-gray-300 rounded-lg py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 ${
                        type === 'fixed_amount' ? 'pl-8 pr-3' : 'pl-3 pr-8'
                      }`}
                      placeholder={type === 'percentage' ? '10' : '500'}
                    />
                    {type === 'percentage' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {type === 'percentage' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Maximum discount amount (optional)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      Rs
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      placeholder="No limit"
                    />
                  </div>
                </div>
              )}
              {/* Description */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Summer sale 20% off"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>

            {/* Minimum purchase requirements */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Minimum purchase requirements
              </p>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="min_req"
                    checked={!hasMinOrder}
                    onChange={() => {
                      setHasMinOrder(false);
                      setMinOrderAmount('');
                    }}
                    className="mt-0.5 h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">
                    No minimum requirements
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="min_req"
                    checked={hasMinOrder}
                    onChange={() => setHasMinOrder(true)}
                    className="mt-0.5 h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">
                      Minimum purchase amount
                    </span>
                    {hasMinOrder && (
                      <div className="relative mt-2 max-w-xs">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                          Rs
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={minOrderAmount}
                          onChange={(e) => setMinOrderAmount(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Usage limits */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Usage limits
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Total usage limit (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="Unlimited"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty for unlimited uses
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Limit per customer
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={usagePerCustomer}
                    onChange={(e) => setUsagePerCustomer(e.target.value)}
                    className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            {/* Active dates */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Active dates
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start date
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    End date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">Summary</p>
              {code ? (
                <div className="text-sm space-y-2">
                  <p className="font-mono font-medium text-gray-900">
                    {code.toUpperCase()}
                  </p>
                  <div className="border-t border-gray-100 pt-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Type
                    </p>
                    <p className="text-sm text-gray-700">
                      {discountContext === 'products'
                        ? 'Amount off products'
                        : 'Amount off order'}
                    </p>
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                      Details
                    </p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 mt-1">•</span>
                        {type === 'percentage'
                          ? `${value || '0'}% off`
                          : `Rs ${value || '0'} off`}
                        {discountContext === 'products'
                          ? ' specific products'
                          : ' entire order'}
                      </li>
                      {hasMinOrder && minOrderAmount && (
                        <li className="flex items-start gap-1.5">
                          <span className="text-gray-400 mt-1">•</span>
                          Minimum purchase of Rs {minOrderAmount}
                        </li>
                      )}
                      {type === 'percentage' && maxDiscount && (
                        <li className="flex items-start gap-1.5">
                          <span className="text-gray-400 mt-1">•</span>
                          Max discount Rs {maxDiscount}
                        </li>
                      )}
                      {usageLimit && (
                        <li className="flex items-start gap-1.5">
                          <span className="text-gray-400 mt-1">•</span>
                          Limited to {usageLimit} uses
                        </li>
                      )}
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-400 mt-1">•</span>
                        {usagePerCustomer && parseInt(usagePerCustomer) > 1
                          ? `${usagePerCustomer} uses per customer`
                          : 'One use per customer'}
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No discount code yet
                </p>
              )}
            </div>

            {/* Status */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-gray-900 mb-3">Status</p>
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="discount_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <label
                  htmlFor="discount_active"
                  className="text-sm font-medium text-gray-700"
                >
                  Active
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {isEdit && (
              <button
                onClick={() => setShowDelete(true)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Delete discount
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/coupons')}
              className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Save' : 'Save discount'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowDelete(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-[15px] font-semibold text-gray-900">
                Delete discount
              </h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-gray-900 font-mono">
                  {code}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
