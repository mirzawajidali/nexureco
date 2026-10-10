import { Link } from 'react-router-dom';
import { FREE_SHIPPING_THRESHOLD } from '@/utils/constants';

const linkClass = 'text-brand-black underline underline-offset-2 hover:text-gray-600';

/** Keyword-rich copy for search engines and shoppers, just above the footer (Adidas-style SEO block). */
export default function HomeSeoContent() {
  return (
    <section className="section-padding border-t border-gray-200">
      <div className="container-custom">
        <div className="max-w-4xl">
          <h2 className="type-section mb-6">Men's T-Shirts in Pakistan by Nexure CO</h2>
          <div className="space-y-4 text-sm leading-relaxed text-gray-600">
            <p className="text-sm leading-relaxed">
              Nexure CO is a Lahore-based brand making premium men's T-shirts for everyday wear, delivered across
              Pakistan. Every tee is cut from 100% cotton jersey that is breathable, soft against the skin and holds
              its shape wash after wash, so the basics you reach for most still look sharp months later. They are
              easy to look after too: machine wash cold with similar colours and tumble dry low, and your tee keeps
              its fit and colour.
            </p>
            <p className="text-sm leading-relaxed">
              Shop <Link to="/category/men" className={linkClass}>men's T-shirts</Link> by fit. Our regular fit tees
              have a clean, tailored silhouette that works tucked in or worn loose, while our oversized T-shirts give
              you a relaxed streetwear look with room to move. Signature pieces carry the Nexure icon, either
              embroidered on the chest or applied as a crisp, crack-resistant graphic, and most styles come in Black,
              Heather Grey, Red and Royal Blue.
            </p>
            <p className="text-sm leading-relaxed">
              Looking for something new? See the latest drops in{' '}
              <Link to="/collections/new-arrivals" className={linkClass}>New Arrivals</Link>, the styles customers
              order most in <Link to="/collections/best-sellers" className={linkClass}>Best Sellers</Link>, and
              limited-time prices in the <Link to="/collections/sale" className={linkClass}>Sale</Link>. Not sure
              about your size? Our <Link to="/size-guide" className={linkClass}>T-shirt size guide</Link> has chest
              and length measurements for every fit, from S to 2XL.
            </p>
            <p className="text-sm leading-relaxed">
              Every order is cash on delivery: you pay when your parcel arrives. Delivery takes 3-5 business days
              anywhere in Pakistan, and orders of Rs. {FREE_SHIPPING_THRESHOLD.toLocaleString('en-PK')} or more ship
              free.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
