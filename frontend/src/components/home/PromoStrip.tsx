import { Link } from 'react-router-dom';

interface PromoStripProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaLink: string;
  variant?: 'black' | 'accent' | 'gold' | 'green';
}

const variants: Record<string, { bg: string; text: string; btnBg: string; btnText: string }> = {
  black: { bg: 'bg-brand-black', text: 'text-white', btnBg: 'bg-white', btnText: 'text-brand-black' },
  accent: { bg: 'bg-brand-accent', text: 'text-white', btnBg: 'bg-white', btnText: 'text-brand-accent' },
  gold: { bg: 'bg-brand-gold', text: 'text-brand-black', btnBg: 'bg-brand-black', btnText: 'text-white' },
  green: { bg: 'bg-[#0e4d3c]', text: 'text-white', btnBg: 'bg-white', btnText: 'text-brand-black' },
};

export default function PromoStrip({
  eyebrow,
  title,
  subtitle,
  ctaText,
  ctaLink,
  variant = 'black',
}: PromoStripProps) {
  const v = variants[variant];

  return (
    <section className={`${v.bg} ${v.text} relative overflow-hidden`}>
      <div className="container-custom py-10 md:py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="max-w-2xl">
          {eyebrow && (
            <span className="inline-block text-[11px] md:text-xs font-heading font-bold uppercase tracking-[0.25em] opacity-80 mb-2">
              {eyebrow}
            </span>
          )}
          <h3 className="font-heading font-black uppercase tracking-tight leading-[0.95]"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)' }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="mt-3 text-sm md:text-base opacity-85 max-w-xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        <Link
          to={ctaLink}
          className={`flex-shrink-0 inline-flex items-center gap-2 ${v.btnBg} ${v.btnText} px-7 py-4 font-heading font-bold uppercase text-sm tracking-wider hover:opacity-90 transition-opacity self-start md:self-auto`}
        >
          {ctaText}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
