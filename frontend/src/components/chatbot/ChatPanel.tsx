import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  XMarkIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  TruckIcon,
  ArrowUturnLeftIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon, CubeIcon } from '@heroicons/react/24/solid';
import { useChatStore, ChatMessage } from '@/store/chatStore';
import { FLOW_STEPS, NAVIGATION_ACTIONS } from '@/data/chatFlows';
import { orderApi, chatApi } from '@/api/cart.api';
import { ORDER_STATUS_LABELS } from '@/utils/constants';
import BrandLogo from '@/components/ui/BrandLogo';
import OrderTrackingResult from './OrderTrackingResult';

// ── Quick Action Config ──
const QUICK_ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  track_order_start: { icon: CubeIcon, label: 'Track Order' },
  faq_shipping: { icon: TruckIcon, label: 'Shipping' },
  faq_returns: { icon: ArrowUturnLeftIcon, label: 'Returns' },
  faq_payment: { icon: CreditCardIcon, label: 'Payment' },
  faq_sizing: { icon: ShieldCheckIcon, label: 'Size Guide' },
  contact_support: { icon: ChatBubbleLeftRightIcon, label: 'Support' },
};

// ── Typing Indicator ──
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

export default function ChatPanel() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  const {
    messages,
    currentFlowStep,
    isLoading,
    addMessage,
    removeLastMessage,
    setFlowStep,
    setFlowData,
    clearFlowData,
    setLoading,
    addToHistory,
    resetChat,
    setOpen,
  } = useChatStore();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when flow step changes to an input step
  useEffect(() => {
    if (currentFlowStep) {
      const step = FLOW_STEPS[currentFlowStep];
      if (step?.type === 'input') {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [currentFlowStep]);

  // ── Gemini AI Chat ──
  async function sendToGemini(message: string) {
    const { conversationHistory } = useChatStore.getState();
    setLoading(true);
    addMessage({ sender: 'bot', type: 'loading', content: '' });

    try {
      const response = await chatApi.send(message, conversationHistory);
      const reply: string = response.data.reply;

      removeLastMessage();
      addMessage({
        sender: 'bot',
        type: 'options',
        content: reply,
        options: [{ label: 'Main Menu', action: 'welcome' }],
      });
      addToHistory('user', message);
      addToHistory('model', reply);
    } catch {
      removeLastMessage();
      addMessage({
        sender: 'bot',
        type: 'options',
        content: "I'm having trouble connecting right now. Please try again or use the menu options above.",
        options: [
          { label: 'Contact Support', action: 'contact_support' },
          { label: 'Main Menu', action: 'welcome' },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  // ── Order Tracking ──
  async function performOrderTracking() {
    const { flowData } = useChatStore.getState();
    setLoading(true);
    addMessage({ sender: 'bot', type: 'loading', content: '' });

    try {
      const response = await orderApi.track(flowData.orderNumber, flowData.email);
      const order = response.data;
      removeLastMessage();

      addMessage({
        sender: 'bot',
        type: 'order-result',
        content: "Here's your order status:",
        orderData: {
          orderNumber: order.order_number,
          status: order.status,
          statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
          items: order.items.map((i: { product_name: string; quantity: number; unit_price: number; image_url?: string }) => ({
            name: i.product_name,
            quantity: i.quantity,
            price: i.unit_price,
            image: i.image_url,
          })),
          total: order.total,
          trackingNumber: order.tracking_number || undefined,
          trackingUrl: order.tracking_url || undefined,
          createdAt: order.created_at,
        },
      });

      addMessage({
        sender: 'bot',
        type: 'options',
        content: 'Is there anything else I can help you with?',
        options: [
          { label: 'Track Another Order', action: 'track_order_start' },
          { label: 'Main Menu', action: 'welcome' },
        ],
      });
    } catch {
      removeLastMessage();
      addMessage({
        sender: 'bot',
        type: 'options',
        content: "Sorry, I couldn't find an order with those details. Please double-check your order number and email address.",
        options: [
          { label: 'Try Again', action: 'track_order_start' },
          { label: 'Contact Support', action: 'contact_support' },
          { label: 'Main Menu', action: 'welcome' },
        ],
      });
    } finally {
      setLoading(false);
      clearFlowData();
      setFlowStep(null);
    }
  }

  // ── Flow Action Handler ──
  function handleAction(actionId: string) {
    if (NAVIGATION_ACTIONS[actionId]) {
      navigate(NAVIGATION_ACTIONS[actionId]);
    }
    if (actionId === 'track_order_lookup') {
      performOrderTracking();
      return;
    }
    const step = FLOW_STEPS[actionId];
    if (!step) return;

    addMessage({
      sender: 'bot',
      type: step.type === 'options' ? 'options' : 'text',
      content: step.botMessage,
      options: step.options,
    });
    setFlowStep(actionId);
    setInputValue('');
    setInputError('');
  }

  // ── Input Submit ──
  function handleInputSubmit() {
    const value = inputValue.trim();
    if (!value || isLoading) return;

    const currentStep = currentFlowStep ? FLOW_STEPS[currentFlowStep] : null;
    if (currentStep?.type === 'input' && currentStep.inputField) {
      if (currentStep.inputField.validation && !currentStep.inputField.validation.test(value)) {
        setInputError(currentStep.inputField.errorMessage || 'Invalid input');
        return;
      }
      addMessage({ sender: 'user', type: 'text', content: value });
      setFlowData(currentStep.inputField.field, value);
      setInputValue('');
      setInputError('');
      handleAction(currentStep.inputField.nextStep);
      return;
    }

    addMessage({ sender: 'user', type: 'text', content: value });
    setInputValue('');
    setInputError('');
    setFlowStep(null);
    sendToGemini(value);
  }

  const currentStep = currentFlowStep ? FLOW_STEPS[currentFlowStep] : null;
  const placeholder =
    currentStep?.type === 'input' && currentStep.inputField
      ? currentStep.inputField.placeholder
      : 'Type a message...';

  return (
    <div className="fixed bottom-[4.5rem] right-6 z-[60] w-[400px] h-[560px] max-h-[75vh] flex flex-col bg-white border-2 border-brand-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden animate-slide-in-up max-sm:right-0 max-sm:left-0 max-sm:bottom-16 max-sm:w-full max-sm:h-[70vh] max-sm:border-x-0 max-sm:border-b-0 max-sm:shadow-none">
      {/* ── Header ── */}
      <div className="bg-brand-black text-white px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" variant="light" linkTo="" />
            <div className="h-5 w-px bg-gray-600" />
            <span className="text-[10px] text-gray-400 font-heading font-bold uppercase tracking-[0.15em]">
              Support
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={resetChat}
              className="p-2 hover:bg-white/10 transition-colors"
              title="Reset conversation"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-2 hover:bg-white/10 transition-colors"
              title="Close chat"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scroll-smooth scrollbar-hide bg-gray-50">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onAction={handleAction} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="border-t-2 border-brand-black p-4 flex-shrink-0 bg-white">
        {inputError && (
          <p className="text-[11px] text-brand-accent font-heading font-bold uppercase tracking-wider mb-2">
            {inputError}
          </p>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setInputError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInputSubmit();
            }}
            placeholder={placeholder}
            disabled={isLoading}
            className="input-field !py-2.5 disabled:opacity-50"
          />
          <button
            onClick={handleInputSubmit}
            disabled={!inputValue.trim() || isLoading}
            className="px-3.5 bg-brand-black text-white hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Message Bubble ──

function MessageBubble({
  message,
  onAction,
}: {
  message: ChatMessage;
  onAction: (action: string) => void;
}) {
  if (message.type === 'loading') {
    return (
      <div className="flex justify-start">
        <div className="bg-white border border-gray-200 px-4 py-2">
          <TypingIndicator />
        </div>
      </div>
    );
  }

  if (message.sender === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-brand-black text-white px-4 py-3 max-w-[80%]">
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // Welcome message with quick action grid
  if (message.type === 'welcome') {
    const welcomeStep = FLOW_STEPS['welcome'];
    return (
      <div className="flex justify-start">
        <div className="max-w-full w-full space-y-3">
          <div className="bg-white border border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-800 leading-relaxed">{message.content}</p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {welcomeStep?.options?.map((opt) => {
              const config = QUICK_ACTION_CONFIG[opt.action];
              const Icon = config?.icon;
              return (
                <button
                  key={opt.action}
                  onClick={() => onAction(opt.action)}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 bg-white border border-gray-200 hover:border-brand-black hover:bg-brand-black hover:text-white text-gray-700 transition-all duration-200 group"
                >
                  {Icon && (
                    <Icon className="w-4 h-4 group-hover:text-white transition-colors" />
                  )}
                  <span className="text-[9px] font-heading font-bold uppercase tracking-[0.1em] text-center leading-tight">
                    {config?.label || opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Order result
  if (message.type === 'order-result' && message.orderData) {
    return (
      <div className="flex justify-start">
        <div className="max-w-full w-full space-y-2">
          <div className="bg-white border border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-800 leading-relaxed">{message.content}</p>
          </div>
          <OrderTrackingResult data={message.orderData} />
        </div>
      </div>
    );
  }

  // Bot text or options message
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2">
        {message.content && (
          <div className="bg-white border border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {message.content}
            </p>
          </div>
        )}
        {message.options && message.options.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.options.map((opt) => (
              <button
                key={opt.action}
                onClick={() => onAction(opt.action)}
                className="px-4 py-2 border-2 border-brand-black bg-white text-brand-black font-heading text-[10px] font-bold uppercase tracking-[0.1em] hover:bg-brand-black hover:text-white transition-all duration-200"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
