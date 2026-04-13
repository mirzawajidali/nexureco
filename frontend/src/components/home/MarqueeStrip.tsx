import { APP_NAME } from '@/utils/constants';

interface MarqueeStripProps {
  items?: string[];
  variant?: 'dark' | 'light' | 'accent';
  speed?: 'normal' | 'fast';
}

export default function MarqueeStrip({
  items,
  variant = 'dark',
  speed = 'normal',
}: MarqueeStripProps) {
  const words = items && items.length > 0
    ? items
    : [
        `${APP_NAME.toUpperCase()}`,
        'NEW SEASON',
        'FREE DELIVERY ON 5+ TEES',
        'LIMITED DROPS',
        'MEMBERS GET 15% OFF',
      ];

  // Duplicate for seamless loop
  const loop = [...words, ...words];

  const bgClass =
    variant === 'light'
      ? 'bg-white text-brand-black border-y border-gray-200'
      : variant === 'accent'
        ? 'bg-brand-accent text-white'
        : 'bg-brand-black text-white';

  const animClass = speed === 'fast' ? 'animate-marquee-fast' : 'animate-marquee';

  return (
    <div className={`relative overflow-hidden py-4 md:py-5 ${bgClass}`}>
      <div className={`flex whitespace-nowrap ${animClass}`}>
        {loop.map((word, i) => (
          <span
            key={i}
            className="flex items-center font-heading font-black uppercase tracking-tight text-2xl md:text-4xl lg:text-5xl px-6"
          >
            {word}
            <span className="ml-6 inline-block h-2 w-2 rounded-full bg-current opacity-60" />
          </span>
        ))}
      </div>
    </div>
  );
}
