'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Navigation, Loader2, Store } from 'lucide-react';
import { getUserLocation } from '@/lib/geo';

interface NearbyLounge { slug: string; name: string; address: string; price: number | null; inStock: boolean; distanceMi: number }

/**
 * "Where to buy near you" — certified lounges within 25 miles that carry this
 * cigar. Location is requested only on tap (privacy), via the cross-platform geo
 * helper so it works in the apps too.
 */
export function WhereToBuyNearby({ slug }: { slug: string }) {
  const [state, setState] = useState<'idle' | 'locating' | 'loading' | 'done' | 'denied'>('idle');
  const [items, setItems] = useState<NearbyLounge[]>([]);

  async function find() {
    setState('locating');
    const loc = await getUserLocation();
    if ('error' in loc) { setState('denied'); return; }
    setState('loading');
    try {
      const res = await fetch(`/api/cigars/${slug}/nearby?lat=${loc.lat}&lng=${loc.lng}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setState('done');
    }
  }

  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-5">
      <div className="flex items-center gap-2">
        <Store size={16} className="text-ember-400" />
        <h3 className="font-display text-lg">Where to buy near you</h3>
      </div>
      <p className="mt-1 text-sm text-smoke-400">Certified lounges within 25 miles that carry this cigar.</p>

      {state === 'idle' && (
        <button onClick={find} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600">
          <Navigation size={13} strokeWidth={1.75} /> Find lounges near me
        </button>
      )}
      {(state === 'locating' || state === 'loading') && (
        <div className="mt-3 flex items-center gap-2 text-sm text-smoke-300"><Loader2 size={14} className="animate-spin text-ember-400" /> {state === 'locating' ? 'Getting your location…' : 'Searching nearby lounges…'}</div>
      )}
      {state === 'denied' && (
        <p className="mt-3 text-sm text-smoke-400">Couldn’t access your location. Enable location access and try again.</p>
      )}
      {state === 'done' && items.length === 0 && (
        <p className="mt-3 text-sm text-smoke-400">No certified lounges within 25 miles list this cigar yet.</p>
      )}
      {state === 'done' && items.length > 0 && (
        <ul className="mt-3 divide-y divide-ember-400/10">
          {items.map((l) => (
            <li key={l.slug}>
              <Link href={`/lounges/${l.slug}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-ember-100">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-paper">{l.name}</span>
                  <span className="flex items-center gap-1 truncate text-xs text-smoke-400"><MapPin size={10} /> {l.address || 'Address on page'}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs tabular text-ember-100">{l.distanceMi.toFixed(1)} mi</span>
                  {l.price != null && <span className="block text-[11px] text-smoke-400">${l.price}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
