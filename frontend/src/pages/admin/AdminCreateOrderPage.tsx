import { useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { adminOrdersApi, adminProductsApi, adminCustomersApi } from '@/api/admin.api';
import { formatPrice } from '@/utils/formatters';

/* ─── Types ─── */

interface SelectedVariant {
  product_id: number;
  variant_id: number | null;
  product_name: string;
  variant_info: string | null;
  price: number;
  quantity: number;
  image_url: string | null;
  available: number;
}

interface CustomItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  taxable: boolean;
  physical: boolean;
}

interface CustomerInfo {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

/* ─── Page ─── */

export default function AdminCreateOrderPage() {
  const navigate = useNavigate();

  // Products
  const [lineItems, setLineItems] = useState<SelectedVariant[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);

  // Modals
  const [showBrowse, setShowBrowse] = useState(false);
  const [showCustomItem, setShowCustomItem] = useState(false);

  // Customer
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Shipping
  const [shipping, setShipping] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Pakistan',
  });

  // Order details
  const [adminNote, setAdminNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showShipping, setShowShipping] = useState(false);

  // Calculations
  const productSubtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const customSubtotal = customItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = productSubtotal + customSubtotal;
  const total = Math.max(subtotal - discountAmount + shippingCost, 0);
  const hasItems = lineItems.length > 0 || customItems.length > 0;

  // Customer search query
  const { data: customerResults } = useQuery({
    queryKey: ['admin', 'customers', 'search', customerSearch],
    queryFn: () => adminCustomersApi.list({ q: customerSearch, page_size: 5 }),
    enabled: customerSearch.length >= 2 && showCustomerDropdown,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => adminOrdersApi.create(payload),
    onSuccess: (res) => {
      toast.success('Order created');
      const orderId = (res.data as { id: number }).id;
      navigate(`/admin/orders/${orderId}`);
    },
    onError: () => toast.error('Failed to create order'),
  });

  const handleSave = () => {
    if (!hasItems) return;

    const items = [
      ...lineItems.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
      })),
      ...customItems.map((item) => ({
        custom_name: item.name,
        custom_price: item.price,
        quantity: item.quantity,
      })),
    ];

    createMutation.mutate({
      items,
      customer_id: customer?.id || null,
      shipping_first_name: shipping.first_name || null,
      shipping_last_name: shipping.last_name || null,
      shipping_phone: shipping.phone || null,
      shipping_address1: shipping.address1 || null,
      shipping_address2: shipping.address2 || null,
      shipping_city: shipping.city || null,
      shipping_state: shipping.state || null,
      shipping_postal_code: shipping.postal_code || null,
      shipping_country: shipping.country,
      admin_note: adminNote || null,
      discount_amount: discountAmount,
      shipping_cost: shippingCost,
    });
  };

  const updateLineItemQty = (index: number, qty: number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const removeCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  };

  const selectCustomer = (c: CustomerInfo) => {
    setCustomer(c);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    // Pre-fill shipping name
    const parts = c.name.split(' ');
    setShipping((prev) => ({
      ...prev,
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' ') || '',
      phone: c.phone || prev.phone,
    }));
  };

  return (
    <>
      <Helmet>
        <title>Create order | Admin</title>
      </Helmet>

      <div className="space-y-5">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/orders" className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5 text-gray-500" />
              Create order
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/orders"
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Discard
            </Link>
            <button
              onClick={handleSave}
              disabled={!hasItems || createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* ─── Main grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ─── Left column ─── */}
          <div className="lg:col-span-2 space-y-5">
            {/* ── Products card ── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-900">Products</h3>
              </div>

              <div className="px-5 py-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      readOnly
                      onClick={() => setShowBrowse(true)}
                      placeholder="Search products"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setShowBrowse(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                  >
                    Browse
                  </button>
                  <button
                    onClick={() => setShowCustomItem(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                  >
                    Add custom item
                  </button>
                </div>

                {/* Line items */}
                {(lineItems.length > 0 || customItems.length > 0) && (
                  <div className="mt-4 divide-y divide-gray-100">
                    {lineItems.map((item, index) => (
                      <div key={`${item.product_id}-${item.variant_id}`} className="py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-100" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                          {item.variant_info && (
                            <p className="text-xs text-gray-500">{item.variant_info}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={item.available}
                            value={item.quantity}
                            onChange={(e) => updateLineItemQty(index, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                          <span className="text-xs text-gray-400">x</span>
                          <span className="text-sm text-gray-700 w-20 text-right">{formatPrice(item.price)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-24 text-right">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeLineItem(index)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {customItems.map((item) => (
                      <div key={item.id} className="py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <PlusIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">Custom item</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1;
                              setCustomItems((prev) =>
                                prev.map((ci) => (ci.id === item.id ? { ...ci, quantity: Math.max(1, qty) } : ci))
                              );
                            }}
                            className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                          <span className="text-xs text-gray-400">x</span>
                          <span className="text-sm text-gray-700 w-20 text-right">{formatPrice(item.price)}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-24 text-right">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeCustomItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Payment card ── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-900">Payment</h3>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">{formatPrice(subtotal)}</span>
                </div>

                {/* Add discount */}
                {!showDiscount ? (
                  <button
                    onClick={() => setShowDiscount(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Add discount
                  </button>
                ) : (
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Discount</span>
                      <input
                        type="number"
                        min={0}
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <button
                        onClick={() => { setShowDiscount(false); setDiscountAmount(0); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-green-600">
                      {discountAmount > 0 ? `-${formatPrice(discountAmount)}` : formatPrice(0)}
                    </span>
                  </div>
                )}

                {/* Add shipping */}
                {!showShipping ? (
                  <button
                    onClick={() => setShowShipping(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Add shipping or delivery
                  </button>
                ) : (
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Shipping</span>
                      <input
                        type="number"
                        min={0}
                        value={shippingCost || ''}
                        onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <button
                        onClick={() => { setShowShipping(false); setShippingCost(0); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-gray-900">{formatPrice(shippingCost)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm text-gray-500">
                  <span>Estimated tax</span>
                  <span>Not calculated</span>
                </div>

                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatPrice(total)}</span>
                </div>
              </div>

              {!hasItems && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-gray-400">Add a product to calculate total and view payment options</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Right sidebar ─── */}
          <div className="space-y-5">
            {/* Notes */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-gray-900">Notes</h3>
                {!isEditingNote && (
                  <button onClick={() => setIsEditingNote(true)} className="p-1 rounded hover:bg-gray-100">
                    <PencilIcon className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <div className="px-5 py-3">
                {isEditingNote ? (
                  <div className="space-y-2">
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={3}
                      placeholder="Add a note..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <button
                      onClick={() => setIsEditingNote(false)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    {adminNote || 'No notes'}
                  </p>
                )}
              </div>
            </div>

            {/* Customer */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-900">Customer</h3>
              </div>
              <div className="px-5 py-3">
                {customer ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                      <button
                        onClick={() => setCustomer(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">{customer.email}</p>
                    {customer.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}

                    {/* Shipping address form */}
                    <div className="pt-3 mt-3 border-t border-gray-100 space-y-2">
                      <p className="text-xs font-medium text-gray-500">Shipping address</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={shipping.first_name}
                          onChange={(e) => setShipping((p) => ({ ...p, first_name: e.target.value }))}
                          placeholder="First name"
                          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <input
                          value={shipping.last_name}
                          onChange={(e) => setShipping((p) => ({ ...p, last_name: e.target.value }))}
                          placeholder="Last name"
                          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      </div>
                      <input
                        value={shipping.phone}
                        onChange={(e) => setShipping((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="Phone"
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <input
                        value={shipping.address1}
                        onChange={(e) => setShipping((p) => ({ ...p, address1: e.target.value }))}
                        placeholder="Address"
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={shipping.city}
                          onChange={(e) => setShipping((p) => ({ ...p, city: e.target.value }))}
                          placeholder="City"
                          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <input
                          value={shipping.state}
                          onChange={(e) => setShipping((p) => ({ ...p, state: e.target.value }))}
                          placeholder="State"
                          className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                      </div>
                      <input
                        value={shipping.postal_code}
                        onChange={(e) => setShipping((p) => ({ ...p, postal_code: e.target.value }))}
                        placeholder="Postal code"
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        placeholder="Search or create a customer"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    {showCustomerDropdown && customerSearch.length >= 2 && customerResults?.data && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {((customerResults.data as { items: Array<{ id: number; first_name: string; last_name: string; email: string; phone: string | null }> }).items || []).map(
                          (c: { id: number; first_name: string; last_name: string; email: string; phone: string | null }) => (
                            <button
                              key={c.id}
                              onClick={() =>
                                selectCustomer({
                                  id: c.id,
                                  name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
                                  email: c.email,
                                  phone: c.phone,
                                })
                              }
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              <p className="font-medium text-gray-900">
                                {c.first_name} {c.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{c.email}</p>
                            </button>
                          )
                        )}
                        {((customerResults.data as { items: unknown[] }).items || []).length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-400">No customers found</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Browse Products Modal ─── */}
      {showBrowse && (
        <BrowseProductsModal
          onClose={() => setShowBrowse(false)}
          existingItems={lineItems}
          onAdd={(items) => {
            setLineItems((prev) => {
              const updated = [...prev];
              for (const item of items) {
                const existIdx = updated.findIndex(
                  (e) => e.product_id === item.product_id && e.variant_id === item.variant_id
                );
                if (existIdx >= 0) {
                  updated[existIdx] = { ...updated[existIdx], quantity: updated[existIdx].quantity + 1 };
                } else {
                  updated.push(item);
                }
              }
              return updated;
            });
            setShowBrowse(false);
          }}
        />
      )}

      {/* ─── Add Custom Item Modal ─── */}
      {showCustomItem && (
        <CustomItemModal
          onClose={() => setShowCustomItem(false)}
          onAdd={(item) => {
            setCustomItems((prev) => [...prev, item]);
            setShowCustomItem(false);
          }}
        />
      )}
    </>
  );
}

/* ─── Browse Products Modal ─── */

interface BrowseProps {
  onClose: () => void;
  existingItems: SelectedVariant[];
  onAdd: (items: SelectedVariant[]) => void;
}

function BrowseProductsModal({ onClose, onAdd }: BrowseProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<string, SelectedVariant>>(new Map());

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['admin', 'products', 'browse', search],
    queryFn: () => adminProductsApi.list({ q: search || undefined, page_size: 50, status: 'active' }),
  });

  const products = (productsData?.data as { items: Array<{
    id: number;
    name: string;
    base_price: number;
    primary_image: string | null;
    total_stock: number;
    variant_count: number;
  }> })?.items || [];

  // For each product, we need to fetch variants when expanded
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);

  const toggleVariant = (variant: SelectedVariant) => {
    const key = `${variant.product_id}-${variant.variant_id}`;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, variant);
      }
      return next;
    });
  };

  const toggleSimpleProduct = (product: { id: number; name: string; base_price: number; primary_image: string | null; total_stock: number }) => {
    const key = `${product.id}-null`;
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, {
          product_id: product.id,
          variant_id: null,
          product_name: product.name,
          variant_info: null,
          price: product.base_price,
          quantity: 1,
          image_url: product.primary_image,
          available: product.total_stock,
        });
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Select products</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* Product list header */}
        <div className="px-5 py-2 border-b border-gray-100 grid grid-cols-[1fr_80px_100px] text-xs text-gray-500 font-medium">
          <span>Product</span>
          <span className="text-right">Available</span>
          <span className="text-right">Price</span>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No products found</div>
          ) : (
            products.map((product) => (
              <ProductBrowseRow
                key={product.id}
                product={product}
                isExpanded={expandedProduct === product.id}
                onToggleExpand={() =>
                  setExpandedProduct(expandedProduct === product.id ? null : product.id)
                }
                selected={selected}
                onToggleVariant={toggleVariant}
                onToggleSimple={toggleSimpleProduct}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">{selected.size} variant{selected.size !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onAdd(Array.from(selected.values()))}
              disabled={selected.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Product row with variant expansion ─── */

interface ProductBrowseRowProps {
  product: {
    id: number;
    name: string;
    base_price: number;
    primary_image: string | null;
    total_stock: number;
    variant_count: number;
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
  selected: Map<string, SelectedVariant>;
  onToggleVariant: (variant: SelectedVariant) => void;
  onToggleSimple: (product: { id: number; name: string; base_price: number; primary_image: string | null; total_stock: number }) => void;
}

function ProductBrowseRow({ product, isExpanded, onToggleExpand, selected, onToggleVariant, onToggleSimple }: ProductBrowseRowProps) {
  const hasVariants = product.variant_count > 1;

  // Fetch full product detail when expanded (to get variant data)
  const { data: detailData } = useQuery({
    queryKey: ['admin', 'products', product.id],
    queryFn: () => adminProductsApi.get(product.id),
    enabled: isExpanded && hasVariants,
  });

  const variants = (detailData?.data as {
    variants?: Array<{
      id: number;
      price: number | null;
      stock_quantity: number;
      is_active: boolean;
      sku: string | null;
      option_values: Array<{ option_value_id: number }>;
    }>;
    options?: Array<{
      id: number;
      name: string;
      values: Array<{ id: number; value: string }>;
    }>;
  })?.variants || [];

  const options = (detailData?.data as {
    options?: Array<{
      id: number;
      name: string;
      values: Array<{ id: number; value: string }>;
    }>;
  })?.options || [];

  const getVariantLabel = useCallback((variant: { option_values: Array<{ option_value_id: number }> }) => {
    const parts: string[] = [];
    for (const ov of variant.option_values) {
      for (const opt of options) {
        const val = opt.values.find((v) => v.id === ov.option_value_id);
        if (val) parts.push(val.value);
      }
    }
    return parts.join(' / ') || 'Default';
  }, [options]);

  if (!hasVariants) {
    // Simple product — single checkbox
    const key = `${product.id}-null`;
    const isSelected = selected.has(key);
    return (
      <div
        className="px-5 py-3 grid grid-cols-[1fr_80px_100px] items-center hover:bg-gray-50 cursor-pointer"
        onClick={() => onToggleSimple(product)}
      >
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={isSelected} readOnly className="rounded text-gray-900 focus:ring-gray-900" />
          <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
            {product.primary_image ? (
              <img src={product.primary_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100" />
            )}
          </div>
          <span className="text-sm text-gray-900 truncate">{product.name}</span>
        </div>
        <span className="text-sm text-right text-gray-600">{product.total_stock}</span>
        <span className="text-sm text-right text-gray-900">{formatPrice(product.base_price)}</span>
      </div>
    );
  }

  // Product with variants — expandable
  return (
    <div>
      <div
        className="px-5 py-3 grid grid-cols-[1fr_80px_100px] items-center hover:bg-gray-50 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={false} readOnly className="rounded opacity-30" />
          <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
            {product.primary_image ? (
              <img src={product.primary_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-100" />
            )}
          </div>
          <span className="text-sm text-gray-900 truncate">{product.name}</span>
        </div>
        <span className="text-sm text-right text-gray-600">{product.total_stock}</span>
        <span className="text-sm text-right text-gray-900">{formatPrice(product.base_price)}</span>
      </div>

      {isExpanded && (
        <div className="bg-gray-50/50">
          {variants.filter((v) => v.is_active).map((variant) => {
            const key = `${product.id}-${variant.id}`;
            const isSelected = selected.has(key);
            const label = getVariantLabel(variant);
            const price = variant.price ?? product.base_price;

            return (
              <div
                key={variant.id}
                className="px-5 pl-16 py-2 grid grid-cols-[1fr_80px_100px] items-center hover:bg-gray-100 cursor-pointer"
                onClick={() =>
                  onToggleVariant({
                    product_id: product.id,
                    variant_id: variant.id,
                    product_name: product.name,
                    variant_info: label,
                    price,
                    quantity: 1,
                    image_url: product.primary_image,
                    available: variant.stock_quantity,
                  })
                }
              >
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={isSelected} readOnly className="rounded text-gray-900 focus:ring-gray-900" />
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
                <span className="text-sm text-right text-gray-600">
                  {variant.stock_quantity === 0 ? (
                    <span className="text-yellow-600">0</span>
                  ) : (
                    variant.stock_quantity
                  )}
                </span>
                <span className="text-sm text-right text-gray-900">{formatPrice(price)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Custom Item Modal ─── */

interface CustomItemModalProps {
  onClose: () => void;
  onAdd: (item: CustomItem) => void;
}

function CustomItemModal({ onClose, onAdd }: CustomItemModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [taxable, setTaxable] = useState(true);
  const [physical, setPhysical] = useState(true);

  const handleAdd = () => {
    if (!name.trim() || !price) return;
    onAdd({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      price: parseFloat(price),
      quantity,
      taxable,
      physical,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Add custom item</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-[1fr_120px_80px] gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Item name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rs</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={taxable}
                onChange={(e) => setTaxable(e.target.checked)}
                className="rounded text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700">Item is taxable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={physical}
                onChange={(e) => setPhysical(e.target.checked)}
                className="rounded text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700">Item is a physical product</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name.trim() || !price}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-40"
          >
            Add item
          </button>
        </div>
      </div>
    </div>
  );
}
