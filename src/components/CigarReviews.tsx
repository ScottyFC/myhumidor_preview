'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Star, MessageSquareText, Crown } from 'lucide-react';
import { fetchCigarReviews, type CommunityReview } from '@/lib/ratings';

/**
 * Community reviews of this cigar — every member's rating with their score,
 * tasting notes, and any written notes. Read from the public `ratings` table.
 */
export function CigarReviews({ slug }: { slug: string }) {
  const [reviews, setReviews] = useState<CommunityReview[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let off = false;
    fetchCigarReviews(slug).then((r) => !off && setReviews(r));
    return () => { off = true; };
  }, [slug]);

  if (!reviews || reviews.length === 0) return null;

  const shown = showAll ? reviews : reviews.slice(0, 6);
  const avg = reviews.reduce((s, r) => s + r.overall, 0) / reviews.length;

  return (
    <div className="mt-12">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-2xl tracking-tightest flex items-center gap-2">
          <MessageSquareText size={18} strokeWidth={1.5} className="text-ember-400" /> Community reviews
        </h2>
        <span className="eyebrow">
          {reviews.length} review{reviews.length === 1 ? '' : 's'} · {avg.toFixed(1)} avg
        </span>
      </div>

      <div className="space-y-3">
        {shown.map((r) => (
          <div key={r.id} className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {r.handle ? (
                  <Link href={`/u/${r.handle}`} className="truncate text-sm font-medium text-paper hover:text-ember-100">
                    {r.displayName}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-medium text-paper">{r.displayName}</span>
                )}
                {r.aficionado && <Crown size={12} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
              </div>
              <div className="inline-flex shrink-0 items-center gap-1 font-display text-base tabular text-ember-100">
                <Star size={13} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                {r.overall.toFixed(1)}
              </div>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-smoke-400">
              Flavor {r.flavor} · Burn {r.burn} · Appearance {r.appearance}
              {' · '}{new Date(r.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
            {r.tastingNotes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.tastingNotes.map((t) => (
                  <span key={t} className="rounded-full border-[0.5px] border-ember-400/20 px-2 py-0.5 text-[11px] text-smoke-200">{t}</span>
                ))}
              </div>
            )}
            {r.notes && <p className="mt-2 text-sm leading-relaxed text-smoke-200">{r.notes}</p>}
            {r.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoUrl} alt="Review photo" loading="lazy" className="mt-3 max-h-56 rounded-lg object-cover" />
            )}
          </div>
        ))}
      </div>

      {reviews.length > 6 && (
        <button onClick={() => setShowAll((v) => !v)} className="btn-ghost mt-3 text-xs">
          {showAll ? 'Show fewer' : `Show all ${reviews.length} reviews`}
        </button>
      )}
    </div>
  );
}
