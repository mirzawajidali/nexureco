import {
  STORE_EMAIL,
  STORE_PHONE,
  STORE_HOURS,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_COST,
} from '@/utils/constants';
import { formatPrice } from '@/utils/formatters';

export interface FlowStep {
  botMessage: string;
  type: 'text' | 'options' | 'input';
  options?: { label: string; action: string }[];
  inputField?: {
    placeholder: string;
    field: string;
    validation?: RegExp;
    errorMessage?: string;
    nextStep: string;
  };
}

export const FLOW_STEPS: Record<string, FlowStep> = {
  // ── Welcome / Main Menu ──
  welcome: {
    botMessage: 'Hi there! Welcome to NEXURE. How can I help you today?',
    type: 'options',
    options: [
      { label: 'Track My Order', action: 'track_order_start' },
      { label: 'Shipping & Delivery', action: 'faq_shipping' },
      { label: 'Returns & Exchanges', action: 'faq_returns' },
      { label: 'Payment & COD', action: 'faq_payment' },
      { label: 'Size Guide', action: 'faq_sizing' },
      { label: 'Contact Support', action: 'contact_support' },
    ],
  },

  // ── Order Tracking Flow ──
  track_order_start: {
    botMessage:
      "I can help you track your order! Please enter your order number (e.g., MB-12345678):",
    type: 'input',
    inputField: {
      placeholder: 'Enter order number',
      field: 'orderNumber',
      nextStep: 'track_order_email',
    },
  },

  track_order_email: {
    botMessage:
      'Got it! Now please enter the email address you used when placing the order:',
    type: 'input',
    inputField: {
      placeholder: 'Enter your email',
      field: 'email',
      validation: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      errorMessage: 'Please enter a valid email address',
      nextStep: 'track_order_lookup',
    },
  },

  // ── Shipping & Delivery ──
  faq_shipping: {
    botMessage: "Here are some common shipping questions. What would you like to know?",
    type: 'options',
    options: [
      { label: 'How long does delivery take?', action: 'faq_delivery_time' },
      { label: 'Do you offer free shipping?', action: 'faq_free_shipping' },
      { label: 'Track My Order', action: 'track_order_start' },
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  faq_delivery_time: {
    botMessage:
      'Standard delivery takes 3-5 business days across Pakistan. Express delivery (1-2 business days) is available at an additional cost for select cities.',
    type: 'options',
    options: [
      { label: 'Track My Order', action: 'track_order_start' },
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  faq_free_shipping: {
    botMessage: `We offer FREE shipping on all orders above ${formatPrice(FREE_SHIPPING_THRESHOLD)}. Standard shipping costs ${formatPrice(STANDARD_SHIPPING_COST)} for orders below that threshold.`,
    type: 'options',
    options: [
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  // ── Returns & Exchanges ──
  faq_returns: {
    botMessage: "Need help with returns? Here's what I can help with:",
    type: 'options',
    options: [
      { label: 'What is your return policy?', action: 'faq_return_policy' },
      { label: 'How do I start a return?', action: 'faq_start_return' },
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  faq_return_policy: {
    botMessage:
      'We offer hassle-free returns within 30 days of delivery. Items must be unworn, unwashed, and in their original packaging with tags attached. Sale items and underwear are final sale.',
    type: 'options',
    options: [
      { label: 'Start a Return', action: 'faq_start_return' },
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  faq_start_return: {
    botMessage:
      'To start a return, please contact our support team with your order number. We will guide you through the process and arrange a pickup at no extra cost.',
    type: 'options',
    options: [
      { label: 'Contact Support', action: 'contact_support' },
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  // ── Payment ──
  faq_payment: {
    botMessage: 'Here are common payment questions:',
    type: 'options',
    options: [
      { label: 'Do you offer Cash on Delivery?', action: 'faq_cod' },
      { label: 'What payment methods do you accept?', action: 'faq_payment_methods' },
      { label: 'Can I cancel or modify my order?', action: 'faq_cancel_order' },
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  faq_cod: {
    botMessage:
      'Yes! Cash on Delivery (COD) is available for all orders within Pakistan. Simply select COD at checkout and pay in cash when your order arrives at your doorstep.',
    type: 'options',
    options: [
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  faq_payment_methods: {
    botMessage:
      'We currently accept Cash on Delivery (COD) for all orders within Pakistan. More payment options coming soon!',
    type: 'options',
    options: [
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  faq_cancel_order: {
    botMessage:
      'You can cancel your order while it is in Pending or Confirmed status. Go to your Account > Orders or contact our support team for assistance.',
    type: 'options',
    options: [
      { label: 'Contact Support', action: 'contact_support' },
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  // ── Sizing ──
  faq_sizing: {
    botMessage: 'Need help finding your perfect fit?',
    type: 'options',
    options: [
      { label: 'How do I find the right size?', action: 'faq_find_size' },
      { label: 'View Size Guide', action: 'link_size_guide' },
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  faq_find_size: {
    botMessage:
      "Check our detailed Size Guide available on every product page. We provide measurements in both inches and centimeters for all sizes across Men's, Women's, and Kids' categories. If you're between sizes, we recommend going with the larger size for a more comfortable fit.",
    type: 'options',
    options: [
      { label: 'View Size Guide', action: 'link_size_guide' },
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  link_size_guide: {
    botMessage: 'Opening the Size Guide for you...',
    type: 'options',
    options: [
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  // ── Contact Support ──
  contact_support: {
    botMessage: `You can reach our support team through:\n\n📧 Email: ${STORE_EMAIL}\n📞 Phone: ${STORE_PHONE}\n🕐 Hours: ${STORE_HOURS}\n\nOr visit our Contact page to send us a message.`,
    type: 'options',
    options: [
      { label: 'Go to Contact Page', action: 'link_contact' },
      { label: 'Main Menu', action: 'welcome' },
    ],
  },

  link_contact: {
    botMessage: 'Taking you to our Contact page...',
    type: 'options',
    options: [
      { label: 'Main Menu', action: 'welcome' },
    ],
  },
};

// Actions that trigger navigation
export const NAVIGATION_ACTIONS: Record<string, string> = {
  link_size_guide: '/page/size-guide',
  link_contact: '/contact',
};
