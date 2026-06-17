'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { supabaseBrowser, isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type VT = 'lounge' | 'retail' | 'both';
const OPTIONS: { id: VT; label: string; hint: string }[] = [
  { id: 'lounge', label: 'Sit-down lounge', hint: 'Customers can smoke on-site' },
  { id: 'retail', label: 'Retailer', hint: 'Sells cigars, no on-site smoking' },
  { id: 'both', label: 'Both', hint: 'Retail + an on-site lounge' },
];

/** Lounge owner sets how their venue is presented (lounge vs retailer). */
export function VenueTypeControl({ slug }: { slug: string }) {
  const [type, setType] = useState<VT | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabaseBrowser().from('lounges').select('venue_type').eq('slug', slug).single()
      .then(({ data }: { data: { venue_type?: string } | null }) => setType(((data?.venue_type as VT) ?? 'lounge')));
  }, [slug]);

  async function pick(t: VT) {
    if (t === type) return;
    setBusy(true); setSaved(false);
    try {
      const { error } = await supabaseBrowser().rpc('set_venue_type', { p_slug: slug, p_type: t });
      if (!error) { setType(t); setSaved(true); }
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-4 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="eyebrow">Venue type</span>
        {busy && <Loader2 size={12} className="animate-spin text-ember-400" />}
        {saved && !busy && <span className="inline-flex items-center gap-1 text-[11px] text-ember-100"><Check size={11} strokeWidth={2} /> Saved</span>}
      </div>
      <p className="mb-3 text-xs text-smoke-400">How your place appears to members — so people know whether they can smoke on-site.</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => pick(o.id)}
            disabled={busy}
            className={cn(
              'rounded-lg border-[0.5px] px-3 py-2 text-left transition',
              type === o.id ? 'border-ember-400/50 bg-ember-400/10' : 'border-ember-400/15 hover:border-ember-400/35'
            )}
          >
            <div className={cn('text-sm font-medium', type === o.id ? 'text-ember-100' : 'text-paper')}>{o.label}</div>
            <div className="text-[11px] text-smoke-400">{o.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
