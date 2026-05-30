'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Store, Cigarette, ArrowRight } from 'lucide-react';
import type { CatalogCigar, CatalogStore } from '@/types';
import { cn, formatUSD } from '@/lib/utils';

interface Suggestion {
  type: 'cigar' | 'store' | 'all';
  href: string;
  label: string;
  sub?: string;
}

export function SearchAutocomplete({ className }: { className?: string }) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(-1);

  // Debounced fetch
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const [c, s] = await Promise.all([
          fetch(`/api/cigars?q=${encodeURIComponent(query)}&limit=6`).then((r) => r.json()),
          fetch(`/api/stores?q=${encodeURIComponent(query)}&limit=4`).then((r) => r.json()),
        ]);
        if (id !== reqId.current) return;
        const cigars: Suggestion[] = (c.items ?? []).map((x: CatalogCigar) => ({
          type: 'cigar' as const,
          href: `/cigars/${x.slug}`,
          label: x.name,
          sub: [x.brand, x.size, x.price != null ? formatUSD(x.price) : null].filter(Boolean).join(' · '),
        }));
        const stores: Suggestion[] = (s.items ?? []).map((x: CatalogStore) => ({
          type: 'store' as const,
          href: `/lounges/${x.slug}`,
          label: x.name,
          sub: [x.city, x.state].filter(Boolean).join(', '),
        }));
        const all: Suggestion = {
          type: 'all',
          href: `/search?q=${encodeURIComponent(query)}`,
          label: `See all results for “${query}”`,
        };
        setSuggestions([...cigars, ...stores, all]);
        setHighlight(-1);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQ('');
    setSuggestions([]);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight >= 0 && suggestions[highlight]) go(suggestions[highlight].href);
      else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showDropdown = open && q.trim().length >= 2;

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <Search
        size={15}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-smoke-400"
      />
      {loading && (
        <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ember-400" />
      )}
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search 23,500+ cigars and shops…"
        aria-label="Search cigars and shops"
        className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/60 py-2 pl-9 pr-9 text-sm focus:border-ember-400 focus:outline-none"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border-[0.5px] border-ember-400/25 bg-char/95 shadow-xl backdrop-blur-md">
          {suggestions.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm text-smoke-400">No matches.</div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={`${s.type}-${s.href}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => go(s.href)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left transition',
                  highlight === i ? 'bg-ember-400/15' : 'hover:bg-ember-400/10',
                  s.type === 'all' && 'border-t-[0.5px] border-ember-400/15'
                )}
              >
                {s.type === 'cigar' && <Cigarette size={14} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
                {s.type === 'store' && <Store size={14} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
                {s.type === 'all' && <ArrowRight size={14} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm', s.type === 'all' ? 'text-ember-100' : 'text-paper')}>
                    {s.label}
                  </span>
                  {s.sub && <span className="block truncate text-xs text-smoke-400">{s.sub}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
