'use client';

import Link from 'next/link';
import { Clock, Crown } from 'lucide-react';
import type { CollectionItem } from '@/lib/collection';

function monthsSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return (Date.now() - then) / (1000 * 60 * 60 * 24 * 30.44);
}

function window(months: number): { label: string; tone: string } {
  if (months < 3) return { label: 'Resting — needs more time', tone: 'text-smoke-400' };
  if (months < 6) return { label: 'Settling in', tone: 'text-smoke-200' };
  if (months < 24) return { label: 'In its prime smoking window', tone: 'text-ember-100' };
  if (months < 48) return { label: 'Well-aged — smoke soon', tone: 'text-amber-300' };
  return { label: 'Past peak for most blends', tone: 'text-smoke-400' };
}

function fmt(months: number): string {
  if (months < 1) return 'under a month';
  if (months < 12) return `${Math.round(months)} mo`;
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  return `${y}y${m ? ` ${m}mo` : ''}`;
}

export function AgingTracker({ humidor, member }: { humidor: CollectionItem[]; member: boolean }) {
  if (!member) {
    return (
      <div className="mt-12 rounded-2xl border-[0.5px] border-ember-400/25 bg-gradient-to-b from-ember-400/10 to-char/40 p-6">
        <div className="flex items-center gap-2">
          <Clock size={16} strokeWidth={1.5} className="text-ember-400" />
          <h2 className="font-display text-xl tracking-tightest">Aging Tracker</h2>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full border-[0.5px] border-ember-400/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ember-100">
            <Crown size={10} strokeWidth={1.5} /> Aficionado
          </span>
        </div>
        <p className="mt-2 text-sm text-smoke-300">
          See how long each cigar has rested and exactly when it enters its prime smoking window.
        </p>
        <Link href="/account?upgrade=aficionado" className="btn-primary mt-4 inline-flex text-sm">
          Unlock with Aficionado
        </Link>
      </div>
    );
  }

  // Only cigars actually kept in the humidor age here — never wishlist or
  // already-smoked entries, regardless of what the caller passes in.
  const rows = [...humidor]
    .filter((c) => c.status === 'humidor')
    .map((c) => ({ c, m: monthsSince(c.addedAt) }))
    .sort((a, b) => b.m - a.m);

  return (
    <div className="mt-12">
      <div className="mb-3 flex items-center gap-2">
        <Clock size={16} strokeWidth={1.5} className="text-ember-400" />
        <h2 className="font-display text-2xl tracking-tightest">Aging Tracker</h2>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-smoke-400">Add cigars to your humidor to start tracking their age.</p>
      ) : (
        <div className="divide-y divide-ember-400/10 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40">
          {rows.map(({ c, m }) => {
            const w = window(m);
            return (
              <div key={c.cigarId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.brand} {c.name}</div>
                  <div className={`text-xs ${w.tone}`}>{w.label}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="tabular text-sm text-paper">{fmt(m)}</div>
                  <div className="text-[11px] text-smoke-500">in humidor</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
