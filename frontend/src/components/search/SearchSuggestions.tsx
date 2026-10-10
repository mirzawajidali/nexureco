import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '@/hooks/useDebounce';
import { searchApi } from '@/api/products.api';

interface SearchSuggestionsProps {
  /**
   * "bar": the full-width search row opened from the search icon (small screens); focuses itself and
   * closes on Esc or "Close". "inline": the always-visible grey search field in the desktop header.
   */
  variant?: 'bar' | 'inline';
  onClose?: () => void;
}

export default function SearchSuggestions({ variant = 'bar', onClose }: SearchSuggestionsProps) {
  const inline = variant === 'inline';
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; slug: string; image: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(!inline);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (inline) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    // Esc closes the search bar (from the input or a suggestion) and puts focus back on the search button
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onCloseRef.current?.();
      opener?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [inline]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    searchApi.suggestions(debouncedQuery).then((res) => {
      setSuggestions(res.data);
    }).catch(() => setSuggestions([]));
  }, [debouncedQuery]);

  const finish = () => {
    if (inline) {
      setQuery('');
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
    onClose?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      // TikTok Pixel: Search event
      if ((window as any).ttq) {
        (window as any).ttq.track('Search', { query: query.trim() });
      }
      finish();
    }
  };

  return (
    <div
      className="relative"
      // Inline: the dropdown closes when focus leaves the field and its suggestions
      onBlur={inline ? (e) => !e.currentTarget.contains(e.relatedTarget) && setShowSuggestions(false) : undefined}
    >
      <form onSubmit={handleSubmit} role="search" className={clsx('flex items-center', inline ? 'bg-gray-100' : 'gap-3')}>
        {!inline && <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />}
        <input
          ref={inputRef}
          type="search"
          aria-label="Search products"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (inline && e.key === 'Escape') {
              e.preventDefault();
              finish();
            }
          }}
          placeholder={inline ? 'Search' : 'Search for products...'}
          className={clsx(
            'flex-1 min-w-0 border-none outline-none placeholder:text-gray-500 [&::-webkit-search-cancel-button]:hidden',
            inline ? 'h-10 bg-transparent pl-3 text-[15px]' : 'text-base',
          )}
        />
        {inline ? (
          <button type="submit" aria-label="Search" className="h-10 px-3 text-brand-black hover:text-gray-600">
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-heading font-bold uppercase tracking-wider text-gray-500 hover:text-brand-black"
          >
            Close
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className={clsx(
            'absolute top-full bg-white border border-gray-200 shadow-lg mt-2 z-50',
            inline ? 'right-0 w-[360px]' : 'left-0 right-0',
          )}
        >
          {suggestions.map((s) => (
            <button
              key={s.slug}
              onClick={() => {
                navigate(`/product/${s.slug}`);
                finish();
              }}
              className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="w-10 h-10 bg-gray-100 flex-shrink-0 overflow-hidden">
                {s.image ? (
                  <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <MagnifyingGlassIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
              <span className="text-sm truncate">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
