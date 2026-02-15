import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PencilIcon,
  TruckIcon,
  ClockIcon,
  PrinterIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { adminOrdersApi } from '@/api/admin.api';
import Spinner from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/formatters';
import type { Order, OrderStatusHistory as StatusEntry } from '@/types/order';

/* ─── helpers ─── */

function fulfillmentLabel(status: string) {
  if (['shipped', 'delivered'].includes(status)) return 'Fulfilled';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'returned') return 'Returned';
  return 'Unfulfilled';
}
function fulfillmentColor(status: string) {
  if (['shipped', 'delivered'].includes(status))
    return 'bg-green-100 text-green-800';
  if (status === 'cancelled') return 'bg-red-100 text-red-800';
  if (status === 'returned') return 'bg-red-100 text-red-800';
  return 'bg-orange-100 text-orange-800';
}
function fulfillmentDot(status: string) {
  if (['shipped', 'delivered'].includes(status)) return 'bg-green-500';
  if (['cancelled', 'returned'].includes(status)) return 'bg-red-500';
  return 'bg-orange-500';
}

function paymentLabel(ps: string) {
  if (ps === 'paid') return 'Paid';
  if (ps === 'refunded') return 'Refunded';
  return 'Payment pending';
}
function paymentColor(ps: string) {
  if (ps === 'paid') return 'bg-green-100 text-green-800';
  if (ps === 'refunded') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
}
function paymentDot(ps: string) {
  if (ps === 'paid') return 'bg-green-500';
  if (ps === 'refunded') return 'bg-red-500';
  return 'bg-yellow-500';
}

function formatOrderDate(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase();
}

function timelineDate(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase();
}

/* ─── badge component ─── */
function Badge({ dot, className, children }: { dot: string; className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

/* ─── page ─── */

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Status update
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Tracking
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  // Notes
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [adminNoteValue, setAdminNoteValue] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orders', id],
    queryFn: () => adminOrdersApi.get(Number(id)),
    enabled: !!id,
  });

  const order = data?.data as Order | undefined;

  // Sync admin note when order loads
  useEffect(() => {
    if (order) {
      setAdminNoteValue(order.admin_note || '');
    }
  }, [order]);

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; note?: string }) =>
      adminOrdersApi.updateStatus(Number(id), payload),
    onSuccess: () => {
      toast.success('Order status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setNewStatus('');
      setStatusNote('');
      setShowStatusForm(false);
    },
    onError: () => toast.error('Failed to update status'),
  });

  const trackingMutation = useMutation({
    mutationFn: (payload: { tracking_number: string; tracking_url?: string }) =>
      adminOrdersApi.updateTracking(Number(id), payload),
    onSuccess: () => {
      toast.success('Tracking updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', id] });
      setTrackingNumber('');
      setTrackingUrl('');
      setShowTrackingForm(false);
    },
    onError: () => toast.error('Failed to update tracking'),
  });

  const handleStatusUpdate = () => {
    if (!newStatus) return;
    statusMutation.mutate({ status: newStatus, ...(statusNote && { note: statusNote }) });
  };

  const handleMarkFulfilled = () => {
    statusMutation.mutate({ status: 'shipped', note: 'Marked as fulfilled' });
  };

  const markPaidMutation = useMutation({
    mutationFn: () => adminOrdersApi.markPaid(Number(id)),
    onSuccess: () => {
      toast.success('Payment marked as paid');
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
    onError: () => toast.error('Failed to mark as paid'),
  });

  const noteMutation = useMutation({
    mutationFn: (note: string) => adminOrdersApi.updateNote(Number(id), { admin_note: note }),
    onSuccess: () => {
      toast.success('Note saved');
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders', id] });
      setIsEditingNote(false);
    },
    onError: () => toast.error('Failed to save note'),
  });

  const handleMarkPaid = () => {
    markPaidMutation.mutate();
  };

  const handleSaveNote = () => {
    noteMutation.mutate(adminNoteValue);
  };

  const handleCancelNote = () => {
    setAdminNoteValue(order?.admin_note || '');
    setIsEditingNote(false);
  };

  const handleEditTracking = () => {
    // Pre-fill with existing values
    if (order) {
      setTrackingNumber(order.tracking_number || '');
      setTrackingUrl(order.tracking_url || '');
    }
    setShowTrackingForm(!showTrackingForm);
  };

  const handleTrackingUpdate = () => {
    if (!trackingNumber) return;
    trackingMutation.mutate({
      tracking_number: trackingNumber,
      ...(trackingUrl && { tracking_url: trackingUrl }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Order not found.</p>
        <Link to="/admin/orders" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  const isFulfilled = ['shipped', 'delivered'].includes(order.status);
  const isPaid = order.payment_status === 'paid';
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const customerName = `${order.shipping_first_name || ''} ${order.shipping_last_name || ''}`.trim();

  return (
    <>
      <Helmet>
        <title>Order #{order.order_number} | Admin</title>
      </Helmet>

      <div className="space-y-5">
        {/* ─── Header ─── */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              to="/admin/orders"
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-5 w-5 text-gray-500" />
              #{order.order_number}
            </h1>
            <Badge dot={paymentDot(order.payment_status)} className={paymentColor(order.payment_status)}>
              {paymentLabel(order.payment_status)}
            </Badge>
            <Badge dot={fulfillmentDot(order.status)} className={fulfillmentColor(order.status)}>
              {fulfillmentLabel(order.status)}
            </Badge>
            <div className="flex-1" />
            <button
              onClick={() => window.print()}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors print:hidden"
              title="Print order"
            >
              <PrinterIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <p className="text-sm text-gray-500 ml-9">
            {formatOrderDate(order.created_at)} from Online Store
          </p>
        </div>

        {/* ─── Main grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ─── Left column ─── */}
          <div className="lg:col-span-2 space-y-5">

            {/* ── Fulfillment card ── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className={`px-5 py-4 border-b border-gray-200 ${isFulfilled ? 'bg-green-50/50' : 'bg-orange-50/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge dot={fulfillmentDot(order.status)} className={fulfillmentColor(order.status)}>
                      {fulfillmentLabel(order.status)}
                    </Badge>
                    {isFulfilled && order.tracking_number && (
                      <span className="text-xs text-gray-500">
                        #{order.tracking_number}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">Standard</span>
                </div>
              </div>

              {/* Product line items */}
              <div className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <TruckIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {item.product_id ? (
                        <Link
                          to={`/admin/products/${item.product_id}`}
                          className="text-sm font-medium text-blue-600 hover:underline truncate block"
                        >
                          {item.product_name}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.product_name}
                        </p>
                      )}
                      {item.variant_info && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.variant_info}</p>
                      )}
                      {item.sku && (
                        <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 whitespace-nowrap">
                      {formatPrice(item.unit_price)} x {item.quantity}
                    </div>
                    <div className="text-sm font-medium text-gray-900 w-24 text-right">
                      {formatPrice(item.total_price)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Fulfillment actions */}
              {!isFulfilled && order.status !== 'cancelled' && order.status !== 'returned' && (
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={handleMarkFulfilled}
                    disabled={statusMutation.isPending}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {statusMutation.isPending ? 'Updating...' : 'Mark as fulfilled'}
                  </button>
                </div>
              )}

              {/* Show tracking info if fulfilled */}
              {isFulfilled && (
                <div className="px-5 py-4 border-t border-gray-200">
                  {order.tracking_number && !showTrackingForm ? (
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-gray-500">Tracking: </span>
                        <span className="font-mono font-medium">{order.tracking_number}</span>
                        {order.tracking_url && (
                          <>
                            {' '}
                            <a
                              href={order.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Track shipment
                            </a>
                          </>
                        )}
                      </div>
                      <button
                        onClick={handleEditTracking}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                  ) : !showTrackingForm ? (
                    <button
                      onClick={handleEditTracking}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Add tracking number
                    </button>
                  ) : null}

                  {showTrackingForm && (
                    <div className="space-y-3">
                      <input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Tracking number"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                      <input
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        placeholder="Tracking URL (optional)"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setShowTrackingForm(false)}
                          className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleTrackingUpdate}
                          disabled={!trackingNumber || trackingMutation.isPending}
                          className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                          {trackingMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Payment card ── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className={`px-5 py-4 border-b border-gray-200 ${isPaid ? 'bg-green-50/50' : 'bg-yellow-50/50'}`}>
                <Badge dot={paymentDot(order.payment_status)} className={paymentColor(order.payment_status)}>
                  {paymentLabel(order.payment_status)}
                </Badge>
              </div>

              <div className="px-5 py-4 space-y-2">
                {/* Summary rows */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-500">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                  <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}
                    </span>
                    <span className="text-green-600">-{formatPrice(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className="text-gray-500">Standard</span>
                  <span className="text-gray-900">
                    {order.shipping_cost > 0 ? formatPrice(order.shipping_cost) : 'Free'}
                  </span>
                </div>
                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span className="text-gray-900">{formatPrice(order.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatPrice(order.total)}</span>
                </div>

                {/* Paid / Balance rows */}
                <div className="pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Paid</span>
                    <span className="text-gray-900">{isPaid ? formatPrice(order.total) : formatPrice(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Balance</span>
                    <span className={`font-medium ${!isPaid ? 'text-yellow-700' : 'text-gray-900'}`}>
                      {isPaid ? formatPrice(0) : formatPrice(order.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                Payment method: <span className="capitalize font-medium text-gray-700">{order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}</span>
              </div>

              {/* Mark as paid action */}
              {!isPaid && (
                <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    onClick={handleMarkPaid}
                    disabled={markPaidMutation.isPending}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {markPaidMutation.isPending ? 'Updating...' : 'Mark as paid'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Timeline ── */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-900">Timeline</h3>
              </div>
              <div className="px-5 py-4">
                {/* Add comment / status update */}
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <ClockIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    {!showStatusForm ? (
                      <button
                        onClick={() => setShowStatusForm(true)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-400 border border-gray-200 rounded-lg hover:border-gray-300"
                      >
                        Leave a comment or update status...
                      </button>
                    ) : (
                      <div className="space-y-3 border border-gray-200 rounded-lg p-3">
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        >
                          <option value="">Select new status...</option>
                          {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'].map((s) => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          rows={2}
                          placeholder="Add a note..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setShowStatusForm(false); setNewStatus(''); setStatusNote(''); }}
                            className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleStatusUpdate}
                            disabled={!newStatus || statusMutation.isPending}
                            className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                          >
                            {statusMutation.isPending ? 'Saving...' : 'Update'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* History entries + Order created — always shown */}
                <div className="relative ml-4 border-l-2 border-gray-200 pl-6 space-y-5">
                  {[...order.status_history].reverse().map((entry: StatusEntry) => (
                    <div key={entry.id} className="relative">
                      <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white bg-gray-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadgeSmall status={entry.status} />
                          <span className="text-xs text-gray-400">
                            {timelineDate(entry.created_at)}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="text-sm text-gray-600 mt-1">{entry.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Order created entry */}
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 border-white bg-gray-300" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Order created</span>
                      <span className="text-xs text-gray-400">{timelineDate(order.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Right sidebar ─── */}
          <div className="space-y-5">
            {/* Notes card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-gray-900">Notes</h3>
                {!isEditingNote && (
                  <button
                    onClick={() => setIsEditingNote(true)}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <PencilIcon className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <div className="px-5 py-3">
                {isEditingNote ? (
                  <div className="space-y-3">
                    <textarea
                      value={adminNoteValue}
                      onChange={(e) => setAdminNoteValue(e.target.value)}
                      rows={3}
                      placeholder="Add a note about this order..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelNote}
                        className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNote}
                        disabled={noteMutation.isPending}
                        className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                      >
                        {noteMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {order.admin_note ? (
                      <p className="text-sm text-gray-600">{order.admin_note}</p>
                    ) : (
                      <p className="text-sm text-gray-400">No notes</p>
                    )}
                    {order.customer_note && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">Customer note</p>
                        <p className="text-sm text-gray-600">{order.customer_note}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Customer card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-900">Customer</h3>
              </div>
              <div className="px-5 py-3">
                {customerName && (
                  <div>
                    {order.user_id ? (
                      <Link
                        to={`/admin/customers/${order.user_id}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {customerName}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">{customerName}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contact information */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-900">Contact information</h3>
              </div>
              <div className="px-5 py-3 space-y-2">
                {order.shipping_phone && (
                  <a
                    href={`tel:${order.shipping_phone}`}
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    {order.shipping_phone}
                  </a>
                )}
              </div>
            </div>

            {/* Shipping address */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-900">Shipping address</h3>
              </div>
              <div className="px-5 py-3 space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-900">{customerName}</p>
                <p>{order.shipping_address1}</p>
                {order.shipping_address2 && <p>{order.shipping_address2}</p>}
                <p>
                  {[order.shipping_city, order.shipping_state, order.shipping_postal_code]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <p>{order.shipping_country}</p>
                {order.shipping_phone && <p>{order.shipping_phone}</p>}
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(
                    [order.shipping_address1, order.shipping_city, order.shipping_state, order.shipping_country]
                      .filter(Boolean)
                      .join(', ')
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs inline-block mt-2"
                >
                  View map
                </a>
              </div>
            </div>

            {/* Billing address */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-900">Billing address</h3>
              </div>
              <div className="px-5 py-3">
                <p className="text-sm text-gray-500">Same as shipping address</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Small status badge for timeline ─── */
function StatusBadgeSmall({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    returned: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full capitalize ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
