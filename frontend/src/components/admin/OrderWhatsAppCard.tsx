import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminOrdersApi } from '@/api/admin.api';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { whatsappLink } from '@/utils/whatsapp';

/**
 * One-click WhatsApp messages to an order's customer: each button opens WhatsApp (app or web) with the
 * text ready to send. Texts come from the backend (services/customer_messages.py).
 */
export default function OrderWhatsAppCard({ orderId, status }: { orderId: number; status: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const { data } = useQuery({
    // status in the key: messages change availability when the order moves on (e.g. delivered)
    queryKey: ['admin', 'orders', orderId, 'messages', status],
    queryFn: () => adminOrdersApi.messages(orderId).then((res) => res.data),
  });

  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
        <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
        <h3 className="text-[13px] font-semibold text-gray-900">Message on WhatsApp</h3>
      </div>
      <div className="px-5 py-3 space-y-3">
        {!data.phone ? (
          <p className="text-sm text-gray-500">The order's phone number isn't a mobile number WhatsApp can use.</p>
        ) : (
          data.messages.map((msg) => (
            <div key={msg.kind}>
              {msg.available ? (
                <a
                  href={whatsappLink(msg.text, data.phone!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-[#1DA851] hover:bg-[#178a43] transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  {msg.label}
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
                >
                  {msg.label}
                </button>
              )}
              <div className="flex items-center justify-between mt-1">
                {!msg.available && msg.reason ? <p className="text-xs text-gray-500">{msg.reason}</p> : <span />}
                <button
                  type="button"
                  onClick={() => setPreview(preview === msg.kind ? null : msg.kind)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {preview === msg.kind ? 'Hide message' : 'Preview message'}
                </button>
              </div>
              {preview === msg.kind && (
                <p className="mt-2 text-xs text-gray-700 whitespace-pre-line bg-gray-50 border border-gray-200 rounded-lg p-3">
                  {msg.text}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
