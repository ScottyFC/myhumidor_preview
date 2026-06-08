'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Star, MapPin } from 'lucide-react';
import { getCheckInsForSlug, getCheckInsForUser, type CheckIn } from '@/lib/checkins';

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function CheckInFeed({ loungeSlug, userId, title = 'Check-ins' }: { loungeSlug?: string; userId?: string; title?: string }) {
  const [items, setItems] = useState<CheckIn[] | null>(null);

  useEffect(() => {
    let off = false;
    const load = loungeSlug ? getCheckInsForSlug(loungeSlug) : userId ? getCheckInsForUser(userId) : Promise.resolve([]);
    load.then((c) => !off && setItems(c));
    return () => { off = true; };
  }, [loungeSlug, userId]);

  if (items === null || items.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="eyebrow mb-3 flex items-center gap-1.5"><Flame size={13} strokeWidth={1.5} className="text-ember-400" /> {title}</h2>
      <div className="space-y-3">
        {items.map((c) => (
          <div key={c.id} className="flex gap-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">
            {c.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.photoUrl} alt="check-in" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm">
                {c.userHandle ? (
                  <Link href={`/u/${c.userHandle}`} className="font-medium text-ember-100 hover:underline">{c.userName ?? 'Someone'}</Link>
                ) : (
                  <span className="font-medium text-ember-100">{c.userName ?? 'Someone'}</span>
                )}
                <span className="text-smoke-300"> is smoking </span>
                {c.cigarSlug ? (
                  <Link href={`/cigars/${c.cigarSlug}`} className="font-medium hover:underline">{[c.cigarBrand, c.cigarName].filter(Boolean).join(' ')}</Link>
                ) : (
                  <span className="font-medium">{[c.cigarBrand, c.cigarName].filter(Boolean).join(' ')}</span>
                )}
              </div>
              {c.loungeSlug && (
                <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-smoke-400">
                  <MapPin size={11} strokeWidth={1.5} /> at{' '}
                  <Link href={`/lounges/${c.loungeSlug}`} className="hover:text-ember-100">{c.loungeName}</Link>
                </div>
              )}
              {c.rating ? (
                <div className="mt-1 inline-flex items-center gap-1 text-sm text-ember-100">
                  <Star size={13} strokeWidth={1.5} className="fill-ember-400 text-ember-400" /> {c.rating.toFixed(1)}
                </div>
              ) : null}
              {c.review && <p className="mt-1 text-sm text-smoke-200">{c.review}</p>}
              <div className="mt-1 text-[11px] text-smoke-500">{ago(c.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
