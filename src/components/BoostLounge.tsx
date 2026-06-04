'use client';

import { useEffect, useState } from 'react';
import { Rocket, Loader2, Check } from 'lucide-react';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';

export function BoostLounge({ slug }: { slug: string }) {
  const [until, setUntil] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabaseBrowser().from('lounges').select('boost_until').eq('slug', slug).single()
      .then(({ data }) => setUntil(data?.boost_until ?? null));
  }, [slug]);

  const active = until ? new Date(until).getTime() > Date.now() : false;

  async function boost() {
    setBusy(true);
    const next = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const { error } = await supabaseBrowser().from('lounges').update({ boost_until: next }).eq('slug', slug);
    setBusy(false);
    if (!error) setUntil(next);
  }

  return (
    <div className="mt-8 rounded-xl border-[0.5px] border-ember-400/20 bg-char/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Rocket size={16} strokeWidth={1.5} className="text-ember-400" />
            <span className="font-display text-lg">Boost your lounge</span>
          </div>
          <p className="mt-1 text-sm text-smoke-300">
            Spend credits to feature your lounge at the top of the homepage carousel for 7 days.
          </p>
        </div>
        {active ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/40 bg-ember-400/10 px-3 py-2 text-sm text-ember-100">
            <Check size={14} strokeWidth={2} /> Boosted until {new Date(until!).toLocaleDateString()}
          </span>
        ) : (
          <button onClick={boost} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-ember-400 px-4 py-2 text-sm font-medium text-paper hover:bg-ember-600 disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} strokeWidth={1.5} />} Boost for 7 days
          </button>
        )}
      </div>
    </div>
  );
}
