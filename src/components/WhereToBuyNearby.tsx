'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Navigation, Loader2, Store, Search } from 'lucide-react';
import { getUserLocation } from '@/lib/geo';
import { geocodePlace } from '@/lib/geocode';

interface NearbyLounge { slug: string; name: string; address: string; price: number | null; inStock: boolean; distanceMi: number }

/**
 * "Where to buy near you" — certified lounges within 25 miles that carry this
 * cigar. Uses device location, with a city/ZIP entry as a fallback.
 */
export function WhereToBuyNearby({ slug }: { slug: string }) {
  const [state, setState] = useState<'idle' | 'locating' | 'loading' | 'done' | 'denied'>('idle');
  const [items, setItems] = useState<NearbyLounge[]>([]);
  const [place, setPlace] = useState('');

  async function run(lat: number, lng: number) {
    setState('loading');
    try {
      const res = await fetch(`/api/cigars/${slug}/nearby?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      setItems(data.items ?? []);
    } finally {
      setState('done');
    }
  }

  async function find() {
    setState('locating');
    const loc = await getUserLocation();
    if ('error' in loc) { setState('denied'); return; }
    await run(loc.lat, loc.lng);
  }

  async function searchPlace() {
    if (!place.trim()) return;
    setState('locating');
    const geo = await geocodePlace(place);
    if (!geo) { setState('denied'); return; }
    await run(geo.lat, geo.lng);
  }

  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-5">
      <div className="flex items-center gap-2">
        <Store size={16} className="text-ember-400" />
        <h3 className="font-display text-lg">Where to buy near you</h3>
      </div>
      <p className="mt-1 text-sm text-smoke-400">Certified lounges within 25 miles that carry this cigar.</p>

      {state === 'idle' && (
        <>
          <button onClick={find} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600">
            <Navigation size={13} strokeWidth={1.75} /> Find lounges near me
          </button>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={place} onChange={(e) => setPlace(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchPlace(); }}
              placeholder="or enter city or ZIP"
              className="min-w-0 flex-1 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-xs text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
            />
            <button onClick={searchPlace} className="inline-flex shrink-0 items-center gap-1 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-xs text-ember-100 hover:bg-ember-400/10">
              <Search size={12} /> Search
            </button>
          </div>
        </>
      )}
      {(state === 'locating' || state === 'loading') && (
        <div className="mt-3 flex items-center gap-2 text-sm text-smoke-300"><Loader2 size={14} className="animate-spin text-ember-400" /> {state === 'locating' ? 'Getting your location…' : 'Searching nearby lounges…'}</div>
      )}
      {state === 'denied' && (
        <div className="mt-3">
          <p className="text-sm text-smoke-400">Couldn’t get your location. Enter a city or ZIP instead:</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={place} onChange={(e) => setPlace(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchPlace(); }}
              placeholder="City or ZIP"
              className="min-w-0 flex-1 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-xs text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
            />
            <button onClick={searchPlace} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ember-400 px-3 py-2 text-xs font-semibold text-paper hover:bg-ember-600">
              <Search size={12} /> Search
            </button>
          </div>
        </div>
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
