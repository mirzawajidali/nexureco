import { useState } from 'react';
import { newsletterApi } from '@/api/user.api';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await newsletterApi.subscribe(email.trim());
      setSubmitted(true);
      setEmail('');
    } catch {
      toast.error('Could not subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-gray-100 section-padding">
      <div className="container-custom text-center">
        <h2 className="text-heading-xl font-heading uppercase mb-3">
          Join the Club
        </h2>
        <p className="text-gray-600 text-sm max-w-md mx-auto mb-8">
          Get early access to new releases, exclusive deals, and 10% off your first order.
        </p>

        {submitted ? (
          <div className="bg-brand-black text-white py-4 px-6 inline-block">
            <p className="font-heading font-bold uppercase text-sm">
              Welcome to the family!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-0 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 border border-gray-300 border-r-0 px-4 py-3 text-sm focus:outline-none focus:border-brand-black"
              required
            />
            <Button type="submit" isLoading={loading}>Subscribe</Button>
          </form>
        )}
      </div>
    </section>
  );
}
