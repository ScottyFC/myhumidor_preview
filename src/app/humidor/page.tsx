'use client';

import { useState } from 'react';
import { MOCK_HUMIDOR, MOCK_USER } from '@/lib/mock-data';
import { CigarCard } from '@/components/CigarCard';
import { cn } from '@/lib/utils';
import type { HumidorStatus } from '@/types';

type Filter = 'all' | HumidorStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'aging', label: 'Aging' },
  { id: 'ready', label: 'Ready' },
  { id: 'smoked', label: 'Smoked' },
  { id: 'wishlist', label: 'Wishlist' },
];

export default function HumidorPage() {
  const [filter, setFilter] = useState<Filter>('all');

  const entries =
    filter === 'all' ? MOCK_HUMIDOR : MOCK_HUMIDOR.filter((e) => e.status === filter);

  const totalQty = MOCK_HUMIDOR.reduce((sum, e) => sum + e.quantity, 0);
  const rated = MOCK_HUMIDOR.filter((e) => e.yourRating !== undefined).length;
  const aging = MOCK_HUMIDOR.filter((e) => e.status === 'aging').length;

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2">{MOCK_USER.displayName}'s collection</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">My Humidor</h1>
        <div className="mt-3 flex gap-6 text-sm text-smoke-200 tabular">
          <span>
            <span className="font-display text-lg text-paper">{totalQty}</span> cigars
          </span>
          <span>
            <span className="font-display text-lg text-paper">{rated}</span> rated
          </span>
          <span>
            <span className="font-display text-lg text-paper">{aging}</span> aging
          </span>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm transition border-[0.5px]',
              filter === f.id
                ? 'bg-ember-600 border-ember-400 text-paper'
                : 'border-ember-400/20 text-smoke-200 hover:border-ember-400/40'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((e) => (
          <CigarCard
            key={e.id}
            cigar={e.cigar}
            quantity={e.quantity}
            status={e.status}
            yourRating={e.yourRating}
          />
        ))}
      </div>

      {entries.length === 0 && (
        <div className="rounded-lg border-[0.5px] border-dashed border-ember-400/20 p-12 text-center text-smoke-400">
          Nothing here yet.
        </div>
      )}
    </div>
  );
}
