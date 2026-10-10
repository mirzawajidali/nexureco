import { useLocation } from 'react-router-dom';
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import ChatPanel from './ChatPanel';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { trackEvent } from '@/utils/analytics';
import { SITE_NAME, SITE_URL } from '@/utils/constants';
import { trackWhatsAppClick, whatsappLink } from '@/utils/whatsapp';

export default function Chatbot() {
  const { isOpen, toggleChat } = useChatStore();
  const isMobileMenuOpen = useUIStore((s) => s.isMobileMenuOpen);
  const isCartOpen = useCartStore((s) => s.isCartOpen);
  const { pathname } = useLocation();

  // Out of the way while the menu or bag drawer is open; they would otherwise sit on top of them
  const hidden = !isOpen && (isMobileMenuOpen || isCartOpen);

  // WhatsApp opens with the page the customer is looking at, so support knows what they mean
  const whatsappText =
    pathname === '/'
      ? `Hi ${SITE_NAME}! I have a question.`
      : `Hi ${SITE_NAME}! I have a question about this page: ${SITE_URL}${pathname}`;

  return (
    <>
      {isOpen && <ChatPanel />}

      {/* Floating actions: icons only, so they cover as little of the page as possible.
          --sticky-bar-height lifts them above a sticky bottom bar (e.g. the product page's Add to Bag). */}
      {!hidden && (
        <div className="fixed z-[60] right-6 bottom-[calc(1.5rem_+_var(--sticky-bar-height,0px))] max-sm:right-3 max-sm:bottom-[calc(0.75rem_+_var(--sticky-bar-height,0px))] flex flex-col items-center gap-2">
          {!isOpen && (
            <a
              href={whatsappLink(whatsappText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick('floating_button')}
              aria-label="Chat with us on WhatsApp"
              title="WhatsApp us"
              className="flex items-center justify-center w-12 h-12 max-sm:w-11 max-sm:h-11 rounded-full bg-[#25D366] text-white shadow-md transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <WhatsAppIcon className="w-6 h-6" />
            </a>
          )}
          <button
            onClick={() => {
              if (!isOpen) trackEvent('open_chat');
              toggleChat();
            }}
            className="flex items-center justify-center w-12 h-12 max-sm:w-11 max-sm:h-11 bg-brand-black text-white border-2 border-brand-black shadow-md transition-all duration-200 hover:bg-gray-800 active:scale-95"
            aria-label={isOpen ? 'Close chat' : 'Chat with us'}
            title={isOpen ? 'Close chat' : 'Chat with us'}
          >
            {isOpen ? <XMarkIcon className="w-5 h-5" /> : <ChatBubbleLeftRightIcon className="w-5 h-5" />}
          </button>
        </div>
      )}
    </>
  );
}
