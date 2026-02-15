import { useState } from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface FilterSidebarProps {
  minPrice?: number;
  maxPrice?: number;
  sort: string;
  onFilterChange: (filters: { min_price?: number; max_price?: number; sort?: string }) => void;
  onClear: () => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
];

const PRICE_RANGES = [
  { label: 'Under Rs. 3,000', min: 0, max: 3000 },
  { label: 'Rs. 3,000 - Rs. 5,000', min: 3000, max: 5000 },
  { label: 'Rs. 5,000 - Rs. 10,000', min: 5000, max: 10000 },
  { label: 'Rs. 10,000 - Rs. 20,000', min: 10000, max: 20000 },
  { label: 'Over Rs. 20,000', min: 20000, max: undefined },
];

export default function FilterSidebar({
  minPrice,
  maxPrice,
  sort,
  onFilterChange,
  onClear,
}: FilterSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sort: true,
    price: true,
  });

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const hasActiveFilters = minPrice !== undefined || maxPrice !== undefined;

  return (
    <div className="space-y-0">
      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="pb-4 mb-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-heading font-bold uppercase tracking-wider">Active Filters</span>
            <button onClick={onClear} className="text-xs text-gray-500 hover:text-brand-black underline">
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(minPrice !== undefined || maxPrice !== undefined) && (
              <span className="inline-flex items-center gap-1 bg-gray-100 px-3 py-1 text-xs">
                {minPrice !== undefined && maxPrice !== undefined
                  ? `Rs. ${minPrice.toLocaleString()} - Rs. ${maxPrice.toLocaleString()}`
                  : minPrice !== undefined
                  ? `Over Rs. ${minPrice.toLocaleString()}`
                  : `Under Rs. ${maxPrice?.toLocaleString()}`}
                <button onClick={() => onFilterChange({ min_price: undefined, max_price: undefined })}>
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sort */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('sort')}
          className="flex items-center justify-between w-full py-4 text-xs font-heading font-bold uppercase tracking-wider"
        >
          Sort By
          <ChevronDownIcon className={clsx('h-4 w-4 transition-transform', openSections.sort && 'rotate-180')} />
        </button>
        {openSections.sort && (
          <div className="pb-4 space-y-2">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onFilterChange({ sort: opt.value })}
                className={clsx(
                  'block w-full text-left text-sm py-1 transition-colors',
                  sort === opt.value ? 'font-bold text-brand-black' : 'text-gray-500 hover:text-brand-black'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full py-4 text-xs font-heading font-bold uppercase tracking-wider"
        >
          Price
          <ChevronDownIcon className={clsx('h-4 w-4 transition-transform', openSections.price && 'rotate-180')} />
        </button>
        {openSections.price && (
          <div className="pb-4 space-y-2">
            {PRICE_RANGES.map((range, i) => {
              const isActive = minPrice === range.min && maxPrice === range.max;
              return (
                <button
                  key={i}
                  onClick={() =>
                    onFilterChange({
                      min_price: isActive ? undefined : range.min,
                      max_price: isActive ? undefined : range.max,
                    })
                  }
                  className={clsx(
                    'block w-full text-left text-sm py-1 transition-colors',
                    isActive ? 'font-bold text-brand-black' : 'text-gray-500 hover:text-brand-black'
                  )}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
