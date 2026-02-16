import { Link } from 'react-router-dom';
import { formatPrice } from '@/utils/formatters';

// Placeholder products until API is connected
const SAMPLE_PRODUCTS = [
  { id: 1, name: 'Classic Running Shoes', price: 8500, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', slug: 'classic-running-shoes' },
  { id: 2, name: 'Urban Street Jacket', price: 12000, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80', slug: 'urban-street-jacket' },
  { id: 3, name: 'Sport Performance Tee', price: 3500, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80', slug: 'sport-performance-tee' },
  { id: 4, name: 'Essential Backpack', price: 6500, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80', slug: 'essential-backpack' },
];

export default function TrendingProducts() {
  return (
    <section className="section-padding bg-gray-50">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-heading-xl font-heading uppercase">Trending Now</h2>
          <Link
            to="/category/new-arrivals"
            className="text-xs font-heading font-bold uppercase tracking-wider border-b-2 border-brand-black pb-0.5 hover:text-gray-600 transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {SAMPLE_PRODUCTS.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.slug}`}
              className="group"
            >
              <div className="aspect-square bg-gray-200 overflow-hidden mb-3">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider group-hover:text-gray-600 transition-colors">
                {product.name}
              </h3>
              <p className="text-sm font-bold mt-1">{formatPrice(product.price)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
