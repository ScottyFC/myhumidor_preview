'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LocateFixed, Loader2, MapPin, BadgeCheck, Search } from 'lucide-react';
import { getUserLocation } from '@/lib/geo';
import { geocodePlace } from '@/lib/geocode';
import type { NearbyStore } from '@/lib/catalog';
import { BrandTile } from '@/components/BrandTile';

export function NearbyLounges() {
  const [state, setState] = useState<'idle' | 'locating' | 'ready' | 'denied' | 'unsupported'>('idle');
  const [lounges, setLounges] = useState<NearbyStore[]>([]);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [place, setPlace] = useState('');

  async function loadNear(lat: number, lng: number) {
    setOrigin({ lat, lng });
    try {
      const res = await fetch(`/api/stores/nearby?lat=${lat}&lng=${lng}&limit=8`);
      const data = await res.json();
      setLounges(data.items ?? []);
    } catch { /* ignore */ }
    setState('ready');
  }

  async function findNearMe() {
    setState('locating');
    const loc = await getUserLocation();
    if ('error' in loc) { setState('denied'); return; }
    await loadNear(loc.lat, loc.lng);
  }

  async function searchPlace() {
    if (!place.trim()) return;
    setState('locating');
    const geo = await geocodePlace(place);
    if (!geo) { setState('denied'); return; }
    await loadNear(geo.lat, geo.lng);
  }

  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-lg">Lounges near you</div>
          <div className="text-sm text-smoke-400">Find the closest spots to wherever you are.</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={findNearMe} disabled={state === 'locating'} className="btn-primary shrink-0">
            {state === 'locating' ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} strokeWidth={1.5} />}
            Find lounges near me
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={place} onChange={(e) => setPlace(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') searchPlace(); }}
          placeholder="or enter a city or ZIP"
          className="min-w-0 flex-1 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
        />
        <button onClick={searchPlace} className="inline-flex shrink-0 items-center gap-1 rounded-md border-[0.5px] border-ember-400/30 px-3 py-2 text-sm text-ember-100 hover:bg-ember-400/10">
          <Search size={14} /> Search
        </button>
      </div>

      {state === 'denied' && (
        <p className="mt-3 text-sm text-smoke-400">Couldn’t get your location — enter a city or ZIP above, or browse the directory below.</p>
      )}
      {state === 'unsupported' && (
        <p className="mt-3 text-sm text-smoke-400">Your browser doesn&apos;t support location. Browse the directory below.</p>
      )}

      {state === 'ready' && lounges.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {lounges.map((l) => (
            <Link
              key={l.id}
              href={`/lounges/${l.slug}`}
              className="group flex items-center gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-3 transition hover:border-ember-400/40"
            >
              <BrandTile name={l.name} src={l.image_url} className="h-11 w-11 shrink-0 text-base" rounded="rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-sm font-medium group-hover:text-ember-100">{l.name}</span>
                  {l.verified && <BadgeCheck size={13} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
                </div>
                <div className="inline-flex items-center gap-1 text-xs text-smoke-400">
                  <MapPin size={11} strokeWidth={1.5} /> {[l.city, l.state].filter(Boolean).join(', ')}
                </div>
              </div>
              <span className="shrink-0 text-xs tabular text-ember-100">{l.distanceMi.toFixed(1)} mi</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
