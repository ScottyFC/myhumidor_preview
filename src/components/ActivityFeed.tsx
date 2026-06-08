'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Flame, MapPin } from 'lucide-react';
import { getCheckInsForUser, type CheckIn } from '@/lib/checkins';
import type { UserRating } from '@/lib/ratings';

type Item =
  | { type: 'rating'; ts: number; r: UserRating }
  | { type: 'checkin'; ts: number; c: CheckIn };

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ActivityFeed({ userId, ratings, title = 'Activity' }: { userId: string; ratings: UserRating[]; title?: string }) {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);

  useEffect(() => {
    let off = false;
    getCheckInsForUser(userId).then((c) => !off && setCheckins(c));
    return () => { off = true; };
  }, [userId]);

  const items: Item[] = [
    ...ratings.map((r) => ({ type: 'rating' as const, ts: new Date(r.createdAt).getTime(), r })),
    ...checkins.map((c) => ({ type: 'checkin' as const, ts: new Date(c.createdAt).getTime(), c })),
  ].sort((a, b) => b.ts - a.ts);

  if (items.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="mb-3 flex items-center gap-2">
        <Flame size={16} strokeWidth={1.5} className="text-ember-400" />
        <h2 className="font-display text-2xl tracking-tightest">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.map((it) =>
          it.type === 'checkin' ? <CheckInRow key={`c_${it.c.id}`} c={it.c} /> : <RatingRow key={`r_${it.r.cigarId}`} r={it.r} />
        )}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">{children}</div>;
}

function RatingRow({ r }: { r: UserRating }) {
  return (
    <Shell>
      <div className="flex items-center gap-1.5 text-xs text-smoke-300">
        <Star size={12} strokeWidth={1.5} className="text-ember-400" /> rated
        <span className="inline-flex items-center gap-0.5 text-ember-100">
          · <Star size={11} strokeWidth={1.5} className="fill-ember-400 text-ember-400" /> {r.overall.toFixed(1)}
        </span>
        <span className="text-smoke-500">· {ago(r.createdAt)}</span>
      </div>
      <Link href={`/cigars/${r.slug}`} className="mt-1 block">
        <span className="text-sm font-medium hover:text-ember-100">{[r.brand, r.name].filter(Boolean).join(' ')}</span>
        <span className="text-xs text-smoke-400"> · {r.size}</span>
      </Link>
      {r.notes && <p className="mt-1 text-sm text-smoke-200">{r.notes}</p>}
      {r.tastingNotes && r.tastingNotes.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {r.tastingNotes.map((t) => (
            <span key={t} className="rounded-full border-[0.5px] border-ember-400/20 px-2 py-0.5 text-[11px] text-smoke-300">{t}</span>
          ))}
        </div>
      )}
    </Shell>
  );
}

function CheckInRow({ c }: { c: CheckIn }) {
  return (
    <Shell>
      <div className="flex gap-3">
        {c.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photoUrl} alt="check-in" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-smoke-300">
            <Flame size={12} strokeWidth={1.5} className="text-ember-400" /> checked in
            {c.rating ? (
              <span className="inline-flex items-center gap-0.5 text-ember-100">
                · <Star size={11} strokeWidth={1.5} className="fill-ember-400 text-ember-400" /> {c.rating.toFixed(1)}
              </span>
            ) : null}
            <span className="text-smoke-500">· {ago(c.createdAt)}</span>
          </div>
          <div className="mt-1 text-sm">
            <span className="text-smoke-300">smoking </span>
            {c.cigarSlug ? (
              <Link href={`/cigars/${c.cigarSlug}`} className="font-medium hover:text-ember-100">{[c.cigarBrand, c.cigarName].filter(Boolean).join(' ')}</Link>
            ) : (
              <span className="font-medium">{[c.cigarBrand, c.cigarName].filter(Boolean).join(' ')}</span>
            )}
          </div>
          {c.loungeSlug && (
            <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-smoke-400">
              <MapPin size={11} strokeWidth={1.5} /> at <Link href={`/lounges/${c.loungeSlug}`} className="hover:text-ember-100">{c.loungeName}</Link>
            </div>
          )}
          {c.review && <p className="mt-1 text-sm text-smoke-200">{c.review}</p>}
        </div>
      </div>
    </Shell>
  );
}
