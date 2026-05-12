// src/components/SearchBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Trie } from '../dsa/Trie';
import { Restaurant } from '../hooks/useRestaurants';

interface Props {
  trie: Trie | null;
  restaurants: Restaurant[];
  onSelect: (restaurant: Restaurant) => void;
}

export default function SearchBar({ trie, restaurants, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Restaurant[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const restaurantMap = useRef<Map<string, Restaurant>>(new Map());
  useEffect(() => {
    restaurantMap.current = new Map(restaurants.map((r) => [r.id, r]));
  }, [restaurants]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (!trie || value.trim() === '') {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const ids = trie.search(value.trim()).slice(0, 8);
    const results = ids.map((id) => restaurantMap.current.get(id)).filter(Boolean) as Restaurant[];
    setSuggestions(results);
    setOpen(results.length > 0);
  };

  const handleSelect = (r: Restaurant) => {
    setQuery(r.name);
    setOpen(false);
    onSelect(r);
  };

  const clear = () => { setQuery(''); setSuggestions([]); setOpen(false); };

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const highlight = (text: string) => {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-blue-600 font-bold">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-[#f0f3ff] border border-[#c1c6d6] focus-within:ring-2 focus-within:ring-[#005bbf]/30">
        <Search className="w-4 h-4 text-[#727785] shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Tìm kiếm (Trie autocomplete)…"
          className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#727785]"
        />
        {query && (
          <button onClick={clear} className="text-[#727785] hover:text-[#111c2d]">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <ul className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-[#c1c6d6] rounded-2xl shadow-xl z-[9999] overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((r) => (
            <li key={r.id}>
              <button
                onMouseDown={() => handleSelect(r)}
                className="w-full px-4 py-3 text-left hover:bg-[#f0f3ff] flex items-center gap-3 transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-[#727785] shrink-0" />
                <div>
                  <p className="text-sm text-[#111c2d]">{highlight(r.name)}</p>
                  <p className="text-[10px] text-[#727785] truncate">{r.address}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}