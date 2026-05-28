'use client';

import { useEffect, useRef } from 'react';
import { MOCK_LOUNGES } from '@/lib/mock-data';
import { MapPin, BadgeCheck } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;

    let map: any;
    (async () => {
      const mb = await import('mapbox-gl');
      // @ts-ignore — runtime CSS
      await import('mapbox-gl/dist/mapbox-gl.css');
      mb.default.accessToken = MAPBOX_TOKEN;
      map = new mb.default.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-82.4572, 27.9506], // Tampa
        zoom: 9,
      });

      for (const l of MOCK_LOUNGES) {
        const el = document.createElement('div');
        el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${
          l.verified ? '#BA7517' : '#5F5E5A'
        };border:2px solid #0F0A06;cursor:pointer;`;
        new mb.default.Marker(el).setLngLat([l.lng, l.lat]).addTo(map);
      }
    })();

    return () => map?.remove();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2">Cigar Maps</div>
        <h1 className="font-display text-5xl tracking-tightest">Find a lounge near you</h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          Verified CigarTV partner lounges show in ember; unverified shops show in gray. Tap a marker
          to see what they have in stock.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {MAPBOX_TOKEN ? (
            <div ref={containerRef} className="aspect-[4/3] w-full rounded-xl overflow-hidden" />
          ) : (
            <div className="aspect-[4/3] w-full rounded-xl border-[0.5px] border-dashed border-ember-400/30 bg-leather-deep flex items-center justify-center text-center px-8">
              <div>
                <MapPin className="mx-auto text-ember-400 mb-3" size={32} strokeWidth={1.5} />
                <div className="font-display text-xl">Set NEXT_PUBLIC_MAPBOX_TOKEN</div>
                <div className="text-sm text-smoke-400 mt-2">
                  Grab a token at <span className="text-ember-100">account.mapbox.com</span> and add it
                  to .env.local to render the interactive map.
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="eyebrow mb-2">Nearby lounges</div>
          {MOCK_LOUNGES.map((l) => (
            <div key={l.id} className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-base font-medium leading-tight flex items-center gap-1">
                    {l.name}
                    {l.verified && (
                      <BadgeCheck size={14} strokeWidth={1.5} className="text-ember-400" />
                    )}
                  </div>
                  <div className="text-xs text-smoke-400 mt-0.5">{l.address}</div>
                  <div className="text-xs text-smoke-400">{l.city}, {l.state}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs tabular text-ember-100">{l.distanceMi?.toFixed(1)} mi</div>
                  {l.inventoryCount && (
                    <div className="text-[10px] text-smoke-400 mt-0.5 tabular">
                      {l.inventoryCount} in stock
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
