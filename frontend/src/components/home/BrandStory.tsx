import { Link } from 'react-router-dom';

export default function BrandStory() {
  return (
    <section className="relative bg-brand-black overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[520px] lg:min-h-[600px]">
        {/* Image side */}
        <div className="relative h-[360px] lg:h-auto overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&q=80"
            alt="Our Story"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          {/* Subtle fade into the black panel on desktop */}
          <div className="hidden lg:block absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-brand-black to-transparent" />
          {/* Bottom fade on mobile */}
          <div className="lg:hidden absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-brand-black to-transparent" />
        </div>

        {/* Content side */}
        <div className="relative flex items-center px-6 py-12 md:px-12 lg:px-16 xl:px-20">
          <div className="max-w-lg">
            {/* Eyebrow */}
            <span className="inline-block text-[11px] font-heading font-bold uppercase tracking-[0.25em] text-gray-500 mb-5">
              Our Story
            </span>

            {/* Headline */}
            <h2 className="font-heading font-black uppercase text-white leading-[0.95] tracking-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }}>
              Born to be<br />Different
            </h2>

            {/* Accent line */}
            <div className="w-10 h-[3px] bg-white mb-6" />

            {/* Body text */}
            <p className="text-[15px] text-gray-400 leading-relaxed mb-10 max-w-md">
              We believe in creating fashion that empowers. Every piece in our
              collection is designed with purpose, crafted with precision, and
              made for those who refuse to blend in.
            </p>

            {/* CTA */}
            <Link
              to="/page/about"
              className="inline-flex items-center gap-3 group"
            >
              <span className="text-xs font-heading font-bold uppercase tracking-[0.15em] text-white group-hover:text-gray-300 transition-colors">
                Learn More
              </span>
              <span className="flex items-center justify-center w-10 h-10 border border-white/30 group-hover:border-white group-hover:bg-white group-hover:text-brand-black text-white transition-all duration-200">
                <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
