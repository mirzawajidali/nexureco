import { create } from 'zustand';

export interface ChatOption {
  label: string;
  action: string;
  icon?: string;
}

export interface OrderResultData {
  orderNumber: string;
  status: string;
  statusLabel: string;
  items: { name: string; quantity: number; price: number; image?: string }[];
  total: number;
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  type: 'text' | 'options' | 'welcome' | 'order-result' | 'loading';
  content: string;
  options?: ChatOption[];
  orderData?: OrderResultData;
}

export interface ChatHistoryItem {
  role: string;
  content: string;
}

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  currentFlowStep: string | null;
  flowData: Record<string, string>;
  isLoading: boolean;
  conversationHistory: ChatHistoryItem[];

  toggleChat: () => void;
  setOpen: (open: boolean) => void;
  addMessage: (message: Omit<ChatMessage, 'id'>) => void;
  removeLastMessage: () => void;
  setFlowStep: (step: string | null) => void;
  setFlowData: (key: string, value: string) => void;
  clearFlowData: () => void;
  setLoading: (loading: boolean) => void;
  addToHistory: (role: string, content: string) => void;
  resetChat: () => void;
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const WELCOME_MESSAGE: Omit<ChatMessage, 'id'> = {
  sender: 'bot',
  type: 'welcome',
  content: 'Hi there! Welcome to NEXURE. How can I help you today?',
};

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  messages: [{ ...WELCOME_MESSAGE, id: uid() }],
  currentFlowStep: null,
  flowData: {},
  isLoading: false,
  conversationHistory: [],

  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (open) => set({ isOpen: open }),

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, { ...message, id: uid() }] })),

  removeLastMessage: () =>
    set((s) => ({ messages: s.messages.slice(0, -1) })),

  setFlowStep: (step) => set({ currentFlowStep: step }),

  setFlowData: (key, value) =>
    set((s) => ({ flowData: { ...s.flowData, [key]: value } })),

  clearFlowData: () => set({ flowData: {} }),

  setLoading: (loading) => set({ isLoading: loading }),

  addToHistory: (role, content) =>
    set((s) => ({
      conversationHistory: [...s.conversationHistory, { role, content }],
    })),

  resetChat: () =>
    set({
      messages: [{ ...WELCOME_MESSAGE, id: uid() }],
      currentFlowStep: null,
      flowData: {},
      isLoading: false,
      conversationHistory: [],
    }),
}));
