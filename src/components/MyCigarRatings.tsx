'use client';

import { useEffect, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { getRatings, onRatingsChange, removeRating, type UserRating } from '@/lib/ratings';

/**
 * The signed-in user's own rating(s) for this cigar, each with a Remove button.
 * Ratings can't be edited — only removed — and rating again adds a new one, so a
 * cigar may legitimately have several entries here over time.
 */
export function MyCigarRatings({ cigarId, slug }: { cigarId: string; slug: string }) {
  const [mine, setMine] = useState<UserRating[]>([]);

  useEffect(() => {
    const sync = () => setMine(getRatings().filter((r) => r.cigarId === cigarId || r.slug === slug));
    sync();
    return onRatingsChange(sync);
  }, [cigarId, slug]);

  if (mine.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="eyebrow mb-3">Your rating{mine.length > 1 ? 's' : ''}</h3>
      <div className="space-y-2">
        {mine.map((r) => (
          <div key={r.id ?? r.createdAt} className="flex items-center justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 px-4 py-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 font-display text-lg tabular text-ember-100">
                <Star size={14} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                {r.overall.toFixed(1)}
                <span className="ml-1 text-[10px] uppercase tracking-wider text-smoke-400">
                  F {r.flavor} · B {r.burn} · A {r.appearance}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-smoke-400">
                {new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                {r.notes ? ` · ${r.notes}` : ''}
              </div>
            </div>
            <button
              onClick={() => removeRating(r.id ?? '')}
              title="Remove this rating"
              aria-label="Remove this rating"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-[0.5px] border-ember-400/20 text-smoke-400 transition hover:border-red-400/50 hover:text-red-400"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
