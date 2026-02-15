import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  XCircleIcon,
  ShoppingBagIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { adminSearchApi } from '@/api/admin.api';
import { formatPrice } from '@/utils/formatters';
import { ORDER_STATUS_LABELS } from '@/utils/constants';
import { APP_NAME } from '@/utils/constants';

interface SearchProduct {
  id: number;
  name: string;
  slug: string;
  base_price: number;
  status: string;
  image_url: string | null;
  variant_count: number;
}

interface SearchOrder {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  customer_name: string;
  created_at: string | null;
}

interface SearchCustomer {
  id: number;
  name: string;
  email: string;
  orders_count: number;
}

interface SearchResults {
  products: SearchProduct[];
  orders: SearchOrder[];
  customers: SearchCustomer[];
  products_count: number;
  orders_count: number;
  customers_count: number;
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-600' },
  archived: { bg: 'bg-red-50', text: 'text-red-600' },
};

const ORDER_STATUS_DOT: Record<string, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  processing: 'bg-blue-500',
  shipped: 'bg-cyan-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  returned: 'bg-red-500',
};

const PAYMENT_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  paid: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  refunded: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
};

export default function AdminSearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await adminSearchApi.search(q.trim());
      setResults(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim()) {
      setLoading(true);
      debounceRef.current = setTimeout(() => doSearch(query), 300);
    } else {
      setResults(null);
      setLoading(false);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  function goTo(path: string) {
    onClose();
    navigate(path);
  }

  if (!open) return null;

  const hasQuery = query.trim().length > 0;
  const hasResults =
    results &&
    (results.products.length > 0 ||
      results.orders.length > 0 ||
      results.customers.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b border-gray-200 px-4">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 px-3 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Category Tabs (when results exist) */}
        {hasQuery && results && hasResults && (
          <div className="flex gap-2 px-4 pt-3 pb-2">
            {results.products_count > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                Products {results.products_count}
              </span>
            )}
            {results.orders_count > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                Orders {results.orders_count}
              </span>
            )}
            {results.customers_count > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                Customers {results.customers_count}
              </span>
            )}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Empty state (no query) */}
          {!hasQuery && (
            <div className="py-16 text-center">
              <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Find anything in {APP_NAME}.
              </p>
            </div>
          )}

          {/* Loading */}
          {hasQuery && loading && !results && (
            <div className="py-12 text-center">
              <div className="inline-block h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          )}

          {/* No results */}
          {hasQuery && !loading && results && !hasResults && (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          )}

          {/* Product Results */}
          {results && results.products.length > 0 && (
            <div>
              {results.products.map((product) => {
                const badge = STATUS_BADGE[product.status] ?? STATUS_BADGE.draft;
                return (
                  <button
                    key={`p-${product.id}`}
                    onClick={() => goTo(`/admin/products/${product.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Thumbnail */}
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBagIcon className="w-5 h-5 text-gray-400 m-2" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        <span
                          className={clsx(
                            'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium capitalize',
                            badge.bg,
                            badge.text
                          )}
                        >
                          {product.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatPrice(product.base_price)}
                        {product.variant_count > 0 &&
                          ` · ${product.variant_count} variant${product.variant_count !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </button>
                );
              })}
              {results.products_count > 5 && (
                <button
                  onClick={() => goTo(`/admin/products?search=${encodeURIComponent(query)}`)}
                  className="w-full px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors text-left"
                >
                  Show {results.products_count - 5} more products
                </button>
              )}
            </div>
          )}

          {/* Order Results */}
          {results && results.orders.length > 0 && (
            <div>
              {results.orders.map((order) => {
                const payBadge = PAYMENT_BADGE[order.payment_status] ?? PAYMENT_BADGE.pending;
                return (
                  <button
                    key={`o-${order.id}`}
                    onClick={() => goTo(`/admin/orders/${order.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                      <ClipboardDocumentListIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">
                          #{order.order_number}
                        </p>
                        {/* Payment Status Badge */}
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                            payBadge.bg,
                            payBadge.text
                          )}
                        >
                          <span className={clsx('w-1.5 h-1.5 rounded-full', payBadge.dot)} />
                          {order.payment_status === 'pending'
                            ? 'Payment pending'
                            : order.payment_status === 'paid'
                              ? 'Paid'
                              : 'Refunded'}
                        </span>
                        {/* Order Status Badge */}
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700'
                          )}
                        >
                          <span className={clsx('w-1.5 h-1.5 rounded-full', ORDER_STATUS_DOT[order.status] ?? 'bg-gray-400')} />
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {order.customer_name} · {formatPrice(order.total)}
                      </p>
                    </div>
                  </button>
                );
              })}
              {results.orders_count > 5 && (
                <button
                  onClick={() => goTo(`/admin/orders?search=${encodeURIComponent(query)}`)}
                  className="w-full px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors text-left"
                >
                  Show {results.orders_count - 5} more orders
                </button>
              )}
            </div>
          )}

          {/* Customer Results */}
          {results && results.customers.length > 0 && (
            <div>
              {results.customers.map((customer) => (
                <button
                  key={`c-${customer.id}`}
                  onClick={() => goTo(`/admin/customers/${customer.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {customer.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {customer.email}
                      {customer.orders_count > 0 &&
                        ` · ${customer.orders_count} order${customer.orders_count !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </button>
              ))}
              {results.customers_count > 5 && (
                <button
                  onClick={() => goTo(`/admin/customers?search=${encodeURIComponent(query)}`)}
                  className="w-full px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors text-left"
                >
                  Show {results.customers_count - 5} more customers
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono mx-0.5">Esc</kbd> to close
          </span>
          <span className="text-[11px] text-gray-400">
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono mx-0.5">Ctrl</kbd>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono mx-0.5">K</kbd>
            to search
          </span>
        </div>
      </div>
    </div>
  );
}
