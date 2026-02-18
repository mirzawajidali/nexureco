import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { APP_NAME } from '@/utils/constants';

/* ── Values data ── */
const VALUES = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    title: 'Quality First',
    description:
      'Every piece is crafted with premium materials and meticulous attention to detail — built to last, designed to impress.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    title: 'Innovation',
    description:
      'We push boundaries with modern designs that blend street culture and performance — fashion that moves with you.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 10-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324-.324a1.453 1.453 0 00-2.328.377l-.036.073a1.586 1.586 0 01-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 01-5.276 3.67" />
      </svg>
    ),
    title: 'Sustainability',
    description:
      'Committed to a better future through responsible sourcing, eco-friendly packaging, and reducing our environmental footprint.',
  },
];

/* ── Stats data ── */
const STATS = [
  { value: '500+', label: 'Products' },
  { value: '10K+', label: 'Happy Customers' },
  { value: '15+', label: 'Cities' },
  { value: '24/7', label: 'Support' },
];

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us | {APP_NAME}</title>
        <meta
          name="description"
          content={`Learn about ${APP_NAME} — our story, mission, and the values that drive everything we create.`}
        />
      </Helmet>

      {/* ── Hero ── */}
      <section className="bg-brand-black text-white">
        <div className="container-custom pt-8 pb-16 md:pb-24">
          <Breadcrumb items={[{ label: 'About Us' }]} className="!text-gray-500 [&_a]:!text-gray-500 [&_a:hover]:!text-white [&_span:last-child_span]:!text-white" />

          <h1
            className="font-heading font-black uppercase text-white leading-[0.95] tracking-tight max-w-3xl"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
          >
            We don't follow<br />trends — we set them
          </h1>

          <p className="mt-6 text-gray-400 text-base md:text-lg leading-relaxed max-w-xl">
            Built for those who dare to stand out. We create fashion that
            empowers confidence, champions individuality, and never compromises
            on quality.
          </p>
        </div>
      </section>

      {/* ── Brand Story ── */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Image */}
            <div className="aspect-[4/5] bg-[#eceff1] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80"
                alt="Our workshop"
                className="w-full h-full object-cover"
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            {/* Content */}
            <div>
              <span className="text-[11px] font-heading font-bold uppercase tracking-[0.25em] text-gray-400 mb-4 block">
                Our Story
              </span>
              <h2
                className="font-heading font-black uppercase leading-[0.95] tracking-tight mb-6"
                style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}
              >
                Born from passion,<br />built with purpose
              </h2>
              <div className="w-10 h-[3px] bg-brand-black mb-6" />
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  What started as a vision to redefine fashion has grown into a
                  brand that thousands trust. We saw a gap — quality apparel that
                  speaks to modern culture without the inflated price tags.
                </p>
                <p>
                  Every collection is thoughtfully designed, from fabric selection
                  to the final stitch. We work directly with skilled artisans and
                  manufacturers who share our obsession with detail.
                </p>
                <p>
                  This isn't just clothing. It's a statement. A community. A
                  movement for those who believe style and substance go hand in
                  hand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[11px] font-heading font-bold uppercase tracking-[0.25em] text-gray-400 mb-4 block">
              What We Stand For
            </span>
            <h2
              className="font-heading font-black uppercase leading-[0.95] tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}
            >
              Our Values
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {VALUES.map((v) => (
              <div key={v.title} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-black text-white mb-5">
                  {v.icon}
                </div>
                <h3 className="font-heading font-bold uppercase text-sm tracking-wider mb-3">
                  {v.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-brand-black text-white py-16 md:py-20">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <p
                  className="font-heading font-black tracking-tight"
                  style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}
                >
                  {s.value}
                </p>
                <p className="text-xs font-heading font-bold uppercase tracking-[0.2em] text-gray-400 mt-2">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-padding">
        <div className="container-custom text-center">
          <h2
            className="font-heading font-black uppercase leading-[0.95] tracking-tight mb-4"
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)' }}
          >
            Join the Movement
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            Explore our latest collections and find pieces that speak to who you are.
          </p>
          <Link
            to="/search"
            className="inline-block bg-brand-black text-white px-10 py-4 font-heading font-bold uppercase text-xs tracking-wider hover:bg-gray-800 transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </>
  );
}
