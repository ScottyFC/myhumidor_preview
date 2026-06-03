'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LocateFixed, Loader2, MapPin, BadgeCheck } from 'lucide-react';
import type { NearbyStore } from '@/lib/catalog';
import { BrandTile } from '@/components/BrandTile';

export function NearbyLounges() {
  const [state, setState] = useState<'idle' | 'locating' | 'ready' | 'denied' | 'unsupported'>('idle');
  const [lounges, setLounges] = useState<NearbyStore[]>([]);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);

  function findNearMe() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState('unsupported');
      return;
    }
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigin(here);
        try {
          const res = await fetch(`/api/stores/nearby?lat=${here.lat}&lng=${here.lng}&limit=8`);
          const data = await res.json();
          setLounges(data.items ?? []);
          setState('ready');
        } catch {
          setState('ready');
        }
      },
      () => setState('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
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
          {origin && (
            <Link href={`/map?lat=${origin.lat}&lng=${origin.lng}`} className="btn-ghost shrink-0 text-sm">
              Open map
            </Link>
          )}
        </div>
      </div>

      {state === 'denied' && (
        <p className="mt-3 text-sm text-smoke-400">Location access was blocked. You can still browse the full directory below.</p>
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
