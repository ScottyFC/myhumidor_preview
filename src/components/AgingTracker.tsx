'use client';

import Link from 'next/link';
import { Clock, Crown, Droplets, Thermometer } from 'lucide-react';
import type { CollectionItem } from '@/lib/collection';
import { agingInfo } from '@/lib/aging';
import { CigarName } from '@/components/CigarName';

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

  // Only cigars actually kept in the humidor age here.
  const rows = [...humidor]
    .filter((c) => c.status === 'humidor')
    .map((c) => ({ c, info: agingInfo(c.addedAt) }))
    .sort((a, b) => b.info.months - a.info.months);

  return (
    <div className="mt-12">
      <div className="mb-3 flex items-center gap-2">
        <Clock size={16} strokeWidth={1.5} className="text-ember-400" />
        <h2 className="font-display text-2xl tracking-tightest">Aging Tracker</h2>
      </div>

      {/* Storage guidance — applies to the whole humidor */}
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 px-4 py-3 text-xs">
        <span className="flex items-center gap-1.5 text-smoke-300"><Droplets size={13} className="text-ember-400" /> Humidity: <span className="text-paper">65–70% RH</span> <span className="text-smoke-500">(aim ~69%)</span></span>
        <span className="flex items-center gap-1.5 text-smoke-300"><Thermometer size={13} className="text-ember-400" /> Temp: <span className="text-paper">65–70°F</span></span>
        <span className="text-smoke-500">Steady conditions matter more than a perfect set point.</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-smoke-400">Add cigars to your humidor to start tracking their age.</p>
      ) : (
        <div className="divide-y divide-ember-400/10 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40">
          {rows.map(({ c, info }) => (
            <div key={c.cigarId} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium"><CigarName slug={c.slug} brand={c.brand} name={c.name} mode="full" /></div>
                <div className={`text-xs ${info.tone}`}>{info.status}</div>
                <div className="mt-0.5 text-[11px] text-smoke-500">{info.whenToSmoke}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="tabular text-sm text-paper">{info.ageLabel}</div>
                <div className="text-[11px] text-smoke-500">in humidor</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
