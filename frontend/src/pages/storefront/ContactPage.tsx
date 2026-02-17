import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ChevronDownIcon,
  TruckIcon,
  ArrowPathIcon,
  CreditCardIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { contactApi, type ContactFormData } from '@/api/contact.api';
import { APP_NAME, STORE_EMAIL, STORE_PHONE, STORE_ADDRESS, STORE_HOURS } from '@/utils/constants';
import toast from 'react-hot-toast';

/* ── Help topic cards ── */
const HELP_TOPICS = [
  {
    icon: TruckIcon,
    title: 'Orders & Delivery',
    description: 'Track your order, delivery times, and shipping information.',
    link: '/page/shipping',
  },
  {
    icon: ArrowPathIcon,
    title: 'Returns & Exchanges',
    description: 'Start a return, exchange items, or check refund status.',
    link: '/page/returns',
  },
  {
    icon: CreditCardIcon,
    title: 'Payment & Pricing',
    description: 'Payment methods, COD, pricing inquiries, and promotions.',
    link: '/page/help',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Product & Sizing',
    description: 'Size guides, product care instructions, and authenticity.',
    link: '/size-guide',
  },
];

/* ── FAQ data ── */
const FAQ_ITEMS = [
  {
    q: 'How can I track my order?',
    a: 'You can track your order by visiting the "Track Order" page and entering your order number. You\'ll also receive tracking updates via email once your order ships.',
  },
  {
    q: 'What is your return policy?',
    a: 'We offer hassle-free returns within 30 days of delivery. Items must be unworn, unwashed, and in their original packaging with tags attached.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery takes 3-5 business days. Express delivery is available for 1-2 business day shipping at an additional cost.',
  },
  {
    q: 'Do you offer Cash on Delivery?',
    a: 'Yes! Cash on Delivery (COD) is available for all orders within Pakistan. You can pay in cash when your order arrives at your doorstep.',
  },
  {
    q: 'How do I find the right size?',
    a: 'Check our detailed Size Guide available on every product page. We provide measurements for all sizes across men\'s, women\'s, and kids\' categories.',
  },
  {
    q: 'Can I cancel or modify my order?',
    a: 'You can cancel or modify your order within 1 hour of placing it. After that, the order enters processing and changes may not be possible. Contact our support team for assistance.',
  },
];

/* ── FAQ Accordion Item ── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-sm font-bold text-brand-black pr-8 group-hover:text-gray-600 transition-colors">
          {question}
        </span>
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-60 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-sm text-gray-600 leading-relaxed pr-8">{answer}</p>
      </div>
    </div>
  );
}

/* ── Contact form ── */
function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ContactFormData>();

  const mutation = useMutation({
    mutationFn: (data: ContactFormData) => contactApi.submit(data),
    onSuccess: () => setSubmitted(true),
    onError: () => toast.error('Failed to send message. Please try again.'),
  });

  if (submitted) {
    return (
      <div className="bg-gray-50 p-8 text-center">
        <div className="w-14 h-14 bg-brand-black text-white flex items-center justify-center mx-auto mb-5">
          <EnvelopeIcon className="w-7 h-7" />
        </div>
        <h3 className="font-heading font-bold uppercase text-lg mb-2">
          Message Sent
        </h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Thank you for reaching out. Our team will get back to you within 24
          hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="input-label">First Name</label>
          <input
            {...register('first_name', { required: 'First name is required' })}
            className="input-field"
            placeholder="John"
          />
          {errors.first_name && <p className="text-xs text-error mt-1">{errors.first_name.message}</p>}
        </div>
        <div>
          <label className="input-label">Last Name</label>
          <input
            {...register('last_name', { required: 'Last name is required' })}
            className="input-field"
            placeholder="Doe"
          />
          {errors.last_name && <p className="text-xs text-error mt-1">{errors.last_name.message}</p>}
        </div>
      </div>
      <div>
        <label className="input-label">Email</label>
        <input
          type="email"
          {...register('email', { required: 'Email is required' })}
          className="input-field"
          placeholder="john@example.com"
        />
        {errors.email && <p className="text-xs text-error mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <label className="input-label">Order Number (optional)</label>
        <input
          {...register('order_number')}
          className="input-field"
          placeholder="#100001"
        />
      </div>
      <div>
        <label className="input-label">Subject</label>
        <select {...register('subject', { required: 'Please select a subject' })} className="input-field" defaultValue="">
          <option value="" disabled>
            Select a topic
          </option>
          <option>Order Issue</option>
          <option>Return / Exchange</option>
          <option>Product Question</option>
          <option>Payment Issue</option>
          <option>Website Feedback</option>
          <option>Other</option>
        </select>
        {errors.subject && <p className="text-xs text-error mt-1">{errors.subject.message}</p>}
      </div>
      <div>
        <label className="input-label">Message</label>
        <textarea
          {...register('message', { required: 'Message is required' })}
          rows={5}
          className="input-field resize-none"
          placeholder="How can we help you?"
        />
        {errors.message && <p className="text-xs text-error mt-1">{errors.message.message}</p>}
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full sm:w-auto bg-brand-black text-white px-10 py-4 font-heading font-bold uppercase text-xs tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}

/* ── Main Page ── */
export default function ContactPage() {
  return (
    <>
      <Helmet>
        <title>Contact Us | {APP_NAME}</title>
        <meta
          name="description"
          content="Get in touch with our support team. We're here to help with orders, returns, products, and more."
        />
      </Helmet>

      {/* Hero */}
      <section className="bg-brand-black text-white">
        <div className="container-custom pt-8 pb-14 md:pb-20">
          <Breadcrumb
            items={[{ label: 'Contact Us' }]}
            className="[&_a]:text-gray-500 [&_span]:text-gray-400 [&_svg]:text-gray-600 mb-8"
          />
          <h1
            className="font-heading font-black uppercase text-white leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)' }}
          >
            How Can We<br />Help You?
          </h1>
        </div>
      </section>

      {/* Help Topics Grid */}
      <section className="container-custom -mt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200">
          {HELP_TOPICS.map((topic) => (
            <a
              key={topic.title}
              href={topic.link}
              className="bg-white p-6 lg:p-8 group hover:bg-gray-50 transition-colors"
            >
              <topic.icon className="w-7 h-7 text-brand-black mb-4" />
              <h3 className="text-sm font-heading font-bold uppercase tracking-wider mb-2 group-hover:underline">
                {topic.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {topic.description}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Contact Channels + Form */}
      <section className="container-custom section-padding">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Left — Contact channels */}
          <div className="lg:col-span-2">
            <span className="text-[11px] font-heading font-bold uppercase tracking-[0.25em] text-gray-400 mb-4 block">
              Get in Touch
            </span>
            <h2 className="text-heading-xl font-heading uppercase mb-8">
              Contact Us
            </h2>

            <div className="space-y-8">
              {/* Chat */}
              <div className="flex gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-gray-100 flex-shrink-0">
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-heading font-bold uppercase tracking-wider mb-1">
                    Live Chat
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Chat with our team in real-time.<br />
                    {STORE_HOURS}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-gray-100 flex-shrink-0">
                  <EnvelopeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-heading font-bold uppercase tracking-wider mb-1">
                    Email
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {STORE_EMAIL}<br />
                    We respond within 24 hours
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-gray-100 flex-shrink-0">
                  <PhoneIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-heading font-bold uppercase tracking-wider mb-1">
                    Phone
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {STORE_PHONE}<br />
                    {STORE_HOURS}
                  </p>
                </div>
              </div>

              {/* Address */}
              <div className="flex gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-gray-100 flex-shrink-0">
                  <MapPinIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-heading font-bold uppercase tracking-wider mb-1">
                    Visit Us
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {STORE_ADDRESS}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 p-6 md:p-10">
              <h3 className="text-sm font-heading font-bold uppercase tracking-wider mb-6">
                Send Us a Message
              </h3>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-50">
        <div className="container-custom section-padding">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-[11px] font-heading font-bold uppercase tracking-[0.25em] text-gray-400 mb-3 block">
                FAQ
              </span>
              <h2 className="text-heading-xl font-heading uppercase">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="border-t border-gray-200">
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.q} question={item.q} answer={item.a} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
