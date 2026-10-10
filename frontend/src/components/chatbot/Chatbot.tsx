import { useEffect, useState } from 'react';
import { ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useChatStore } from '@/store/chatStore';
import ChatPanel from './ChatPanel';
import { trackEvent } from '@/utils/analytics';

export default function Chatbot() {
  const { isOpen, toggleChat } = useChatStore();
  // Once the visitor scrolls, shrink to the icon so the button covers less of the page
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 200);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {isOpen && <ChatPanel />}

      {/* Floating Action Button */}
      <button
        onClick={() => {
          if (!isOpen) trackEvent('open_chat');
          toggleChat();
        }}
        className="fixed bottom-6 right-6 z-[60] group flex items-center gap-0 max-sm:bottom-4 max-sm:right-4"
        aria-label={isOpen ? 'Close chat' : 'Chat with us'}
      >
        {/* Label pill — visible when chat is closed and the page is near the top */}
        {!isOpen && !scrolled && (
          <span className="hidden sm:flex items-center bg-white text-brand-black border-2 border-brand-black px-4 py-2.5 font-heading text-[11px] font-bold uppercase tracking-[0.15em] mr-[-2px] transition-all duration-200 group-hover:bg-brand-black group-hover:text-white">
            Chat with us
          </span>
        )}

        {/* Icon square */}
        <span className="flex items-center justify-center w-12 h-12 bg-brand-black text-white border-2 border-brand-black transition-all duration-200 group-hover:bg-gray-800 active:scale-95">
          {isOpen ? (
            <XMarkIcon className="w-5 h-5" />
          ) : (
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          )}
        </span>
      </button>
    </>
  );
}
