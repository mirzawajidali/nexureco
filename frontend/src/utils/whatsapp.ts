import { WHATSAPP_NUMBER } from './constants';
import { trackEvent } from './analytics';

declare global {
  interface Window {
    // Meta and TikTok pixels (loaded in index.html)
    fbq?: (...args: unknown[]) => void;
    ttq?: { track?: (...args: unknown[]) => void };
  }
}

/**
 * A Pakistani phone number in the international form wa.me expects (digits only, country code first):
 * "0316 7936302", "+92 316 7936302" and "92-316-7936302" all become "923167936302".
 */
export function toWhatsAppNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith('3')) digits = `92${digits}`;
  return digits;
}

/** Link that opens WhatsApp (app or web) with `text` ready to send — to the store unless `phone` is given. */
export function whatsappLink(text: string, phone: string = WHATSAPP_NUMBER): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`;
}

/** Report a customer opening WhatsApp to GA4 and the ad pixels (a "Contact" conversion). */
export function trackWhatsAppClick(source: string) {
  trackEvent('contact', { method: 'whatsapp', source });
  window.fbq?.('track', 'Contact');
  window.ttq?.track?.('Contact');
}
