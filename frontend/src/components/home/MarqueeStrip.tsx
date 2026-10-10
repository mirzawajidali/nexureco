import { useState } from 'react';
import { PauseIcon, PlayIcon } from '@heroicons/react/24/solid';
import { APP_NAME, FREE_SHIPPING_MESSAGE } from '@/utils/constants';

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
  // Moving content needs a way to stop it (WCAG 2.2.2); "reduce motion" users never see it move
  const [paused, setPaused] = useState(false);

  const words = items && items.length > 0
    ? items
    : [
        `${APP_NAME.toUpperCase()}`,
        'NEW SEASON',
        FREE_SHIPPING_MESSAGE.toUpperCase(),
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
  const buttonBgClass =
    variant === 'light'
      ? 'bg-white border-black/30 hover:border-black'
      : `${variant === 'accent' ? 'bg-brand-accent' : 'bg-brand-black'} border-white/40 hover:border-white`;

  const animClass = speed === 'fast' ? 'animate-marquee-fast' : 'animate-marquee';

  return (
    <div className={`relative overflow-hidden py-4 md:py-5 ${bgClass}`}>
      <div
        className={`flex whitespace-nowrap ${animClass}`}
        style={{ animationPlayState: paused ? 'paused' : 'running' }}
      >
        {loop.map((word, i) => (
          <span
            key={i}
            // The second copy only exists for the seamless loop, so screen readers skip it
            aria-hidden={i >= words.length || undefined}
            className="flex items-center font-display uppercase tracking-[3px] text-2xl md:text-4xl lg:text-5xl px-6"
          >
            {word}
            <span className="ml-6 inline-block h-2 w-2 rounded-full bg-current opacity-60" />
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? 'Play scrolling text' : 'Pause scrolling text'}
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center border transition-colors motion-reduce:hidden ${buttonBgClass}`}
      >
        {paused ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}
