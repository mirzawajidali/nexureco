import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import {
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { adminContactApi } from '@/api/admin.api';
import Spinner from '@/components/ui/Spinner';
import { formatDateTime } from '@/utils/formatters';

interface ContactMessage {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  order_number: string | null;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

type StatusFilter = 'all' | 'new' | 'read' | 'replied';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
];

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  new: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  read: { dot: 'bg-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  replied: { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  archived: { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.archived;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', s.bg, s.text)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', s.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* ── Detail / Reply Modal ── */
function MessageDetailModal({
  msg,
  onClose,
}: {
  msg: ContactMessage;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState(msg.admin_reply ?? '');

  const replyMutation = useMutation({
    mutationFn: () => adminContactApi.reply(msg.id, replyText),
    onSuccess: () => {
      toast.success('Reply saved');
      queryClient.invalidateQueries({ queryKey: ['admin-contact'] });
      onClose();
    },
    onError: () => toast.error('Failed to save reply'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl max-w-2xl w-full mx-4 shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {msg.first_name} {msg.last_name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{msg.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <StatusBadge status={msg.status} />
            <span>{formatDateTime(msg.created_at)}</span>
            {msg.order_number && (
              <span className="bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-700">
                Order {msg.order_number}
              </span>
            )}
          </div>

          {/* Subject */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Subject</p>
            <p className="text-sm font-medium text-gray-900">{msg.subject}</p>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Message</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
          </div>

          {/* Previous reply */}
          {msg.admin_reply && msg.replied_at && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wider mb-1">
                Your Reply &middot; {formatDateTime(msg.replied_at)}
              </p>
              <p className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap">{msg.admin_reply}</p>
            </div>
          )}

          {/* Reply textarea */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
              {msg.admin_reply ? 'Update Reply' : 'Write a Reply'}
            </label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-gray-900 transition-colors resize-none"
              placeholder="Type your reply here..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => replyMutation.mutate()}
            disabled={!replyText.trim() || replyMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function AdminContactMessagesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedMsg, setSelectedMsg] = useState<ContactMessage | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const queryParams: Record<string, unknown> = { page, page_size: 20 };
  if (statusFilter !== 'all') queryParams.status = statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-contact', page, statusFilter],
    queryFn: () => adminContactApi.list(queryParams).then((res) => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminContactApi.delete(id),
    onSuccess: () => {
      toast.success('Message deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-contact'] });
      setDeletingId(null);
    },
    onError: () => toast.error('Failed to delete message'),
  });

  const messages: ContactMessage[] = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;

  function handleFilterChange(filter: StatusFilter) {
    setStatusFilter(filter);
    setPage(1);
  }

  return (
    <>
      <Helmet>
        <title>Messages | Admin</title>
      </Helmet>

      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <EnvelopeIcon className="h-5 w-5 text-gray-500" />
            Contact Messages
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">View and respond to customer inquiries</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Status Tabs */}
          <div className="border-b border-gray-200 px-5">
            <div className="flex gap-0">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleFilterChange(tab.value)}
                  className={clsx(
                    'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                    statusFilter === tab.value
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-16 text-center">
              <ChatBubbleLeftRightIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">No messages found</p>
              <p className="text-sm text-gray-500">
                {statusFilter === 'new'
                  ? 'No new messages to review'
                  : statusFilter === 'replied'
                    ? 'No replied messages yet'
                    : 'Contact form submissions will appear here'}
              </p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Subject</th>
                      <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Date</th>
                      <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {messages.map((msg) => (
                      <tr
                        key={msg.id}
                        onClick={() => setSelectedMsg(msg)}
                        className={clsx(
                          'hover:bg-gray-50 cursor-pointer transition-colors',
                          msg.status === 'new' && 'bg-blue-50/30'
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <div>
                            <p className={clsx('text-sm text-gray-900', msg.status === 'new' && 'font-semibold')}>
                              {msg.first_name} {msg.last_name}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{msg.email}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className={clsx('text-sm text-gray-700 truncate max-w-[250px]', msg.status === 'new' && 'font-medium')}>
                            {msg.subject}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[250px]">{msg.message}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={msg.status} />
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {formatDateTime(msg.created_at)}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(msg.id);
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {total} message{total !== 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <span className="px-3 text-sm text-gray-600">
                      {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Message Detail / Reply Modal */}
      {selectedMsg && (
        <MessageDetailModal msg={selectedMsg} onClose={() => setSelectedMsg(null)} />
      )}

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Delete message?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              This action cannot be undone. The message will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deletingId !== null) deleteMutation.mutate(deletingId);
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
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
