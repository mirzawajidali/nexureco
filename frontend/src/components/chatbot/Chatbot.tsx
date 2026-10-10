import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useChatStore } from '@/store/chatStore';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import ChatPanel from './ChatPanel';
import { trackEvent } from '@/utils/analytics';

export default function Chatbot() {
  const { isOpen, toggleChat } = useChatStore();
  const isMobileMenuOpen = useUIStore((s) => s.isMobileMenuOpen);
  const isCartOpen = useCartStore((s) => s.isCartOpen);

  // Out of the way while the menu or bag drawer is open; it would otherwise sit on top of them
  const hidden = !isOpen && (isMobileMenuOpen || isCartOpen);

  return (
    <>
      {isOpen && <ChatPanel />}

      {/* Floating Action Button: an icon only, so it covers as little of the page as possible.
          --sticky-bar-height lifts it above a sticky bottom bar (e.g. the product page's Add to Bag). */}
      {!hidden && (
        <button
          onClick={() => {
            if (!isOpen) trackEvent('open_chat');
            toggleChat();
          }}
          className="fixed z-[60] right-6 bottom-[calc(1.5rem_+_var(--sticky-bar-height,0px))] max-sm:right-3 max-sm:bottom-[calc(0.75rem_+_var(--sticky-bar-height,0px))] flex items-center justify-center w-12 h-12 max-sm:w-11 max-sm:h-11 bg-brand-black text-white border-2 border-brand-black shadow-md transition-all duration-200 hover:bg-gray-800 active:scale-95"
          aria-label={isOpen ? 'Close chat' : 'Chat with us'}
          title={isOpen ? 'Close chat' : 'Chat with us'}
        >
          {isOpen ? <XMarkIcon className="w-5 h-5" /> : <ChatBubbleLeftRightIcon className="w-5 h-5" />}
        </button>
      )}
    </>
  );
}
