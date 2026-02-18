import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '@/hooks/useDebounce';
import { searchApi } from '@/api/products.api';

interface SearchSuggestionsProps {
  onClose: () => void;
}

export default function SearchSuggestions({ onClose }: SearchSuggestionsProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ name: string; slug: string; image: string | null }[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    searchApi.suggestions(debouncedQuery).then((res) => {
      setSuggestions(res.data);
    }).catch(() => setSuggestions([]));
  }, [debouncedQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for products..."
          className="flex-1 border-none outline-none text-base placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-heading font-bold uppercase tracking-wider text-gray-500 hover:text-brand-black"
        >
          Close
        </button>
      </form>

      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-lg mt-2 z-10">
          {suggestions.map((s) => (
            <button
              key={s.slug}
              onClick={() => {
                navigate(`/product/${s.slug}`);
                onClose();
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
