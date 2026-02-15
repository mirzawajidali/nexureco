import { OrderResultData } from '@/store/chatStore';
import { formatPrice, formatDate } from '@/utils/formatters';
import { ORDER_STATUS_LABELS } from '@/utils/constants';

const STATUS_STYLES: Record<string, string> = {
  pending: 'badge-warning',
  confirmed: 'badge-info',
  processing: 'badge-info',
  shipped: 'badge-info',
  delivered: 'badge-success',
  cancelled: 'badge-error',
  returned: 'badge-error',
};

export default function OrderTrackingResult({ data }: { data: OrderResultData }) {
  const badgeClass = STATUS_STYLES[data.status] || 'badge-neutral';
  const statusLabel = ORDER_STATUS_LABELS[data.status] || data.status;
  const displayItems = data.items.slice(0, 3);
  const remaining = data.items.length - displayItems.length;

  return (
    <div className="border-2 border-brand-black overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-brand-black text-white flex items-center justify-between">
        <span className="text-[11px] font-heading font-bold uppercase tracking-[0.15em]">
          #{data.orderNumber}
        </span>
        <span className={`${badgeClass} text-[9px]`}>
          {statusLabel}
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100">
        {displayItems.map((item, i) => (
          <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-700 truncate flex-1">
              {item.name}
              {item.quantity > 1 && (
                <span className="text-gray-400 ml-1">x{item.quantity}</span>
              )}
            </span>
            <span className="text-xs font-heading font-bold text-gray-900 flex-shrink-0">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <div className="px-4 py-2">
            <span className="text-[11px] text-gray-400 uppercase tracking-wider">
              +{remaining} more item{remaining > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-heading font-bold uppercase tracking-[0.15em] text-gray-500">
            Total
          </span>
          <span className="text-sm font-heading font-bold">{formatPrice(data.total)}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-gray-400">
            Placed {formatDate(data.createdAt)}
          </span>
          {data.trackingUrl && (
            <a
              href={data.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-heading font-bold uppercase tracking-[0.1em] text-brand-black border-b border-brand-black hover:border-transparent transition-colors"
            >
              Track Package
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
