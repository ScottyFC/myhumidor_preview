'use client';

import { useEffect, useState } from 'react';
import { Wallet, Tv } from 'lucide-react';
import { getMyLounges } from '@/lib/lounges-owner';

export function LoungeCreditsBanner() {
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    let off = false;
    getMyLounges().then((ls) => { if (!off && ls[0]) setCredits(ls[0].credits); });
    return () => { off = true; };
  }, []);

  if (credits === null) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border-[0.5px] border-ember-400/25 bg-ember-400/5 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ember-400/15 text-ember-400">
          <Wallet size={18} strokeWidth={1.5} />
        </span>
        <div>
          <div className="eyebrow">Credit balance</div>
          <div className="font-display text-3xl tracking-tightest tabular">{credits.toLocaleString()}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-smoke-300">
        <Tv size={13} strokeWidth={1.5} className="text-ember-400" />
        Grows with viewing time once your screens connect to the CigarTV app.
      </div>
    </div>
  );
}
