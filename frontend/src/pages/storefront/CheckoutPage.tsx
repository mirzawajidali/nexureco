import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { orderApi } from '@/api/cart.api';
import { formatPrice } from '@/utils/formatters';
import { APP_NAME, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST } from '@/utils/constants';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const checkoutSchema = z.object({
  guest_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  shipping_first_name: z.string().min(1, 'First name is required'),
  shipping_last_name: z.string().min(1, 'Last name is required'),
  shipping_phone: z.string().min(1, 'Phone number is required'),
  shipping_address1: z.string().min(1, 'Address is required'),
  shipping_address2: z.string().optional(),
  shipping_city: z.string().min(1, 'City is required'),
  shipping_state: z.string().min(1, 'State/Province is required'),
  shipping_postal_code: z.string().min(1, 'Postal code is required'),
  shipping_country: z.string().default('Pakistan'),
  customer_note: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const STEPS = ['Shipping', 'Review', 'Confirmation'] as const;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, couponCode, subtotal, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData | null>(null);

  const total = subtotal();
  const shipping = total >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  const grandTotal = total + shipping;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shipping_country: 'Pakistan',
      guest_email: '',
    },
  });

  const handleShippingSubmit = (data: CheckoutFormData) => {
    // Guest must provide email
    if (!isAuthenticated && (!data.guest_email || data.guest_email.trim() === '')) {
      toast.error('Email is required for guest checkout');
      return;
    }
    setFormData(data);
    setCurrentStep(1);
    window.scrollTo(0, 0);
  };

  const handlePlaceOrder = async () => {
    if (!formData) return;

    setIsSubmitting(true);
    try {
      const response = await orderApi.checkout({
        ...formData,
        guest_email: !isAuthenticated ? formData.guest_email || undefined : undefined,
        items: items.map((item) => ({
          product_id: item.productId,
          variant_id: item.variantId,
          quantity: item.quantity,
        })),
        coupon_code: couponCode || undefined,
      });
      clearCart();
      navigate(`/order-confirmation/${response.data.order_number}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && currentStep < 2) {
    navigate('/cart');
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Checkout | {APP_NAME}</title>
      </Helmet>

      <div className="container-custom py-8">
        <Breadcrumb items={[{ label: 'Cart', href: '/cart' }, { label: 'Checkout' }]} />

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    'w-8 h-8 flex items-center justify-center text-sm font-bold',
                    i < currentStep
                      ? 'bg-brand-black text-white'
                      : i === currentStep
                      ? 'border-2 border-brand-black text-brand-black'
                      : 'border-2 border-gray-300 text-gray-300'
                  )}
                >
                  {i < currentStep ? <CheckCircleIcon className="h-5 w-5" /> : i + 1}
                </div>
                <span
                  className={clsx(
                    'text-xs font-heading font-bold uppercase tracking-wider',
                    i <= currentStep ? 'text-brand-black' : 'text-gray-300'
                  )}
                >
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={clsx(
                    'w-16 h-0.5 mx-3',
                    i < currentStep ? 'bg-brand-black' : 'bg-gray-300'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Step 1: Shipping */}
            {currentStep === 0 && (
              <div>
                <h2 className="text-heading font-heading uppercase mb-6">
                  {isAuthenticated ? 'Shipping Information' : 'Contact & Shipping'}
                </h2>
                <form onSubmit={handleSubmit(handleShippingSubmit)} className="space-y-4">
                  {/* Guest email field */}
                  {!isAuthenticated && (
                    <div className="pb-4 mb-2 border-b border-gray-200">
                      <Input
                        label="Email Address"
                        type="email"
                        placeholder="your@email.com"
                        {...register('guest_email')}
                        error={errors.guest_email?.message}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        We'll send your order confirmation and tracking updates here.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      {...register('shipping_first_name')}
                      error={errors.shipping_first_name?.message}
                    />
                    <Input
                      label="Last Name"
                      {...register('shipping_last_name')}
                      error={errors.shipping_last_name?.message}
                    />
                  </div>
                  <Input
                    label="Phone Number"
                    {...register('shipping_phone')}
                    error={errors.shipping_phone?.message}
                  />
                  <Input
                    label="Address"
                    {...register('shipping_address1')}
                    error={errors.shipping_address1?.message}
                  />
                  <Input
                    label="Apartment, suite, etc. (optional)"
                    {...register('shipping_address2')}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="City"
                      {...register('shipping_city')}
                      error={errors.shipping_city?.message}
                    />
                    <Input
                      label="State / Province"
                      {...register('shipping_state')}
                      error={errors.shipping_state?.message}
                    />
                    <Input
                      label="Postal Code"
                      {...register('shipping_postal_code')}
                      error={errors.shipping_postal_code?.message}
                    />
                  </div>
                  <Input label="Country" {...register('shipping_country')} disabled />
                  <div>
                    <label className="input-label">Order Notes (optional)</label>
                    <textarea
                      {...register('customer_note')}
                      rows={3}
                      className="input-field resize-none"
                      placeholder="Special instructions for delivery..."
                    />
                  </div>
                  <div className="pt-4">
                    <Button type="submit" size="lg" fullWidth>
                      Continue to Review
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Review */}
            {currentStep === 1 && formData && (
              <div>
                <h2 className="text-heading font-heading uppercase mb-6">Review Your Order</h2>

                {/* Contact info for guests */}
                {!isAuthenticated && formData.guest_email && (
                  <div className="border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-heading font-bold uppercase tracking-wider">
                        Contact
                      </h3>
                      <button
                        onClick={() => setCurrentStep(0)}
                        className="text-xs font-heading font-bold uppercase tracking-wider text-gray-500 hover:text-brand-black underline"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">{formData.guest_email}</p>
                  </div>
                )}

                {/* Shipping Address */}
                <div className="border border-gray-200 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-heading font-bold uppercase tracking-wider">
                      Shipping Address
                    </h3>
                    <button
                      onClick={() => setCurrentStep(0)}
                      className="text-xs font-heading font-bold uppercase tracking-wider text-gray-500 hover:text-brand-black underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm">
                    {formData.shipping_first_name} {formData.shipping_last_name}
                  </p>
                  <p className="text-sm text-gray-500">{formData.shipping_address1}</p>
                  {formData.shipping_address2 && (
                    <p className="text-sm text-gray-500">{formData.shipping_address2}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {formData.shipping_city}, {formData.shipping_state}{' '}
                    {formData.shipping_postal_code}
                  </p>
                  <p className="text-sm text-gray-500">{formData.shipping_phone}</p>
                </div>

                {/* Payment Method */}
                <div className="border border-gray-200 p-6 mb-6">
                  <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-4">
                    Payment Method
                  </h3>
                  <div className="flex items-center gap-3 bg-gray-50 p-4">
                    <div className="w-10 h-10 bg-brand-black text-white flex items-center justify-center text-xs font-bold">
                      COD
                    </div>
                    <div>
                      <p className="text-sm font-bold">Cash on Delivery</p>
                      <p className="text-xs text-gray-500">Pay when your order is delivered</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border border-gray-200 p-6">
                  <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-4">
                    Items ({items.length})
                  </h3>
                  <div className="divide-y">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId}`}
                        className="flex gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="w-16 h-16 bg-gray-100 flex-shrink-0">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-bold text-sm uppercase truncate">
                            {item.name}
                          </p>
                          {item.variantInfo && (
                            <p className="text-xs text-gray-500">{item.variantInfo}</p>
                          )}
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold flex-shrink-0">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Place Order Button */}
                <div className="mt-8">
                  <Button
                    onClick={handlePlaceOrder}
                    isLoading={isSubmitting}
                    size="lg"
                    fullWidth
                  >
                    Place Order - {formatPrice(grandTotal)}
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-3">
                    By placing your order, you agree to our{' '}
                    <Link to="/page/terms" className="underline hover:text-brand-black">terms and conditions</Link>
                    {' '}and{' '}
                    <Link to="/page/privacy" className="underline hover:text-brand-black">privacy policy</Link>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="w-full lg:w-80">
            <div className="bg-gray-50 p-6 sticky top-24">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-6">
                Order Summary
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)
                  </span>
                  <span className="font-bold">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-bold">
                    {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                  </span>
                </div>
                {couponCode && (
                  <div className="flex justify-between text-success">
                    <span>Coupon ({couponCode})</span>
                    <span>Applied</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <span className="font-heading font-bold uppercase">Total</span>
                  <span className="text-lg font-bold">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {/* Logged in indicator */}
              {isAuthenticated && user && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Ordering as <span className="font-medium text-brand-black">{user.email}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
