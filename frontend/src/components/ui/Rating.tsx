import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface RatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (value: number) => void;
  readonly?: boolean;
  showValue?: boolean;
}

export default function Rating({
  value,
  max = 5,
  size = 'md',
  onChange,
  readonly = true,
  showValue = false,
}: RatingProps) {
  const sizeClass = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        return (
          <button
            key={i}
            type="button"
            onClick={() => !readonly && onChange?.(i + 1)}
            disabled={readonly}
            className={clsx(
              'text-brand-gold',
              !readonly && 'cursor-pointer hover:scale-110 transition-transform',
              readonly && 'cursor-default'
            )}
          >
            {filled ? (
              <StarIcon className={sizeClass[size]} />
            ) : (
              <StarOutline className={clsx(sizeClass[size], 'text-gray-300')} />
            )}
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm text-gray-500">{value.toFixed(1)}</span>
      )}
    </div>
  );
}
