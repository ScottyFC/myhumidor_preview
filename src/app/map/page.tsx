'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, BadgeCheck, LocateFixed, Loader2, Navigation } from 'lucide-react';
import type { NearbyStore } from '@/lib/catalog';
import { cn } from '@/lib/utils';

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  'pk.eyJ1Ijoic2plZmZlcnkiLCJhIjoiY21wcTMybnJkMGl6NDJxb2kwMHdveWc2eCJ9.7-_wuAUyICHe1qg5OOqAvg';
// Custom CigarTV map style
const MAP_STYLE = 'mapbox://styles/sjeffery/cmpr16cqv008z01s7e9o11bmt';

type GeoState = 'idle' | 'locating' | 'ready' | 'denied' | 'unsupported';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mbRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [geo, setGeo] = useState<GeoState>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lounges, setLounges] = useState<NearbyStore[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // Init map once
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const mb = await import('mapbox-gl');
      if (cancelled) return;
      mb.default.accessToken = MAPBOX_TOKEN;
      mbRef.current = mb.default;
      mapRef.current = new mb.default.Map({
        container: containerRef.current!,
        style: MAP_STYLE,
        center: [-98.5, 39.5], // US center until we have the user
        zoom: 3.4,
      });
      mapRef.current.addControl(new mb.default.NavigationControl({ showCompass: false }), 'top-right');
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const plot = useCallback((user: { lat: number; lng: number }, items: NearbyStore[]) => {
    const map = mapRef.current;
    const mb = mbRef.current;
    if (!map || !mb) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // user marker
    const u = document.createElement('div');
    u.style.cssText =
      'width:18px;height:18px;border-radius:50%;background:#E8743B;box-shadow:0 0 0 6px rgba(232,116,59,.25);border:2px solid #0F0A06;';
    markersRef.current.push(new mb.Marker(u).setLngLat([user.lng, user.lat]).addTo(map));

    // lounge markers
    items.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      const el = document.createElement('div');
      el.style.cssText = `width:13px;height:13px;border-radius:50%;cursor:pointer;border:2px solid #0F0A06;background:${
        s.verified ? '#BA7517' : '#8A8782'
      };`;
      el.addEventListener('click', () => focusLounge(s));
      const popup = new mb.Popup({ offset: 14, closeButton: false }).setHTML(
        `<div style="font-family:system-ui;font-size:12px"><strong>${s.name}</strong><br/>${s.city}, ${s.state} · ${s.distanceMi.toFixed(1)} mi</div>`
      );
      markersRef.current.push(
        new mb.Marker(el).setLngLat([s.lng, s.lat]).setPopup(popup).addTo(map)
      );
    });

    // fit to user + nearest few
    const pts = [[user.lng, user.lat], ...items.slice(0, 6).map((s) => [s.lng, s.lat])] as [number, number][];
    if (pts.length > 1) {
      const b = pts.reduce(
        (acc, p) => acc.extend(p),
        new mb.LngLatBounds(pts[0], pts[0])
      );
      map.fitBounds(b, { padding: 80, maxZoom: 11, duration: 900 });
    } else {
      map.flyTo({ center: [user.lng, user.lat], zoom: 10 });
    }
  }, []);

  function focusLounge(s: NearbyStore) {
    setActive(s.id);
    if (s.lat != null && s.lng != null) {
      mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: 12, duration: 700 });
    }
  }

  const findNearMe = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeo('unsupported');
      return;
    }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(user);
        setGeo('ready');
        setLoadingList(true);
        try {
          const res = await fetch(`/api/stores/nearby?lat=${user.lat}&lng=${user.lng}&limit=24`);
          const data = await res.json();
          const items: NearbyStore[] = data.items ?? [];
          setLounges(items);
          plot(user, items);
        } finally {
          setLoadingList(false);
        }
      },
      () => setGeo('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [plot]);

  // If arriving from a lounge profile (?lat=&lng=), center there and load nearby.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const lat = parseFloat(sp.get('lat') ?? '');
    const lng = parseFloat(sp.get('lng') ?? '');
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    const target = { lat, lng };
    setCoords(target);
    setGeo('ready');
    setLoadingList(true);
    (async () => {
      try {
        const res = await fetch(`/api/stores/nearby?lat=${lat}&lng=${lng}&limit=24`);
        const data = await res.json();
        const items: NearbyStore[] = data.items ?? [];
        setLounges(items);
        plot(target, items);
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 13, duration: 800 });
      } finally {
        setLoadingList(false);
      }
    })();
  }, [plot]);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-10">
      <header className="mb-6">
        <div className="eyebrow mb-2">Cigar Maps</div>
        <h1 className="font-display text-5xl tracking-tightest">Find a lounge near you</h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          Share your location and we&apos;ll find the closest cigar lounges and shops. Verified
          CigarTV partners show in ember; other shops in gray.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={findNearMe} disabled={geo === 'locating'} className="btn-primary">
            {geo === 'locating' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <LocateFixed size={15} strokeWidth={1.5} />
            )}
            {geo === 'ready' ? 'Update my location' : 'Find lounges near me'}
          </button>
          {geo === 'denied' && (
            <span className="text-sm text-red-400">
              Location blocked — enable it in your browser settings and try again.
            </span>
          )}
          {geo === 'unsupported' && (
            <span className="text-sm text-red-400">Your browser doesn&apos;t support geolocation.</span>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {MAPBOX_TOKEN ? (
            <div ref={containerRef} className="aspect-[4/3] w-full overflow-hidden rounded-xl" />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border-[0.5px] border-dashed border-ember-400/30 bg-leather-deep px-8 text-center">
              <div>
                <MapPin className="mx-auto mb-3 text-ember-400" size={32} strokeWidth={1.5} />
                <div className="font-display text-xl">Set NEXT_PUBLIC_MAPBOX_TOKEN</div>
                <div className="mt-2 text-sm text-smoke-400">
                  Add your Mapbox token to .env.local to render the interactive map.
                </div>
              </div>
            </div>
          )}
        </div>

        <aside>
          <div className="eyebrow mb-3">
            {geo === 'ready' ? `${lounges.length} nearest lounges` : 'Nearby lounges'}
          </div>

          {geo === 'idle' && (
            <div className="rounded-lg border-[0.5px] border-dashed border-ember-400/25 bg-char/40 p-6 text-center text-sm text-smoke-300">
              <Navigation size={22} strokeWidth={1.5} className="mx-auto mb-2 text-ember-400" />
              Tap “Find lounges near me” to see the closest shops, sorted by distance.
            </div>
          )}

          {loadingList && (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto animate-spin text-ember-400" size={22} />
            </div>
          )}

          {geo === 'ready' && !loadingList && (
            <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {lounges.map((l) => (
                <button
                  key={l.id}
                  onClick={() => focusLounge(l)}
                  className={cn(
                    'block w-full rounded-lg border-[0.5px] bg-char/50 p-3 text-left transition',
                    active === l.id
                      ? 'border-ember-400 bg-ember-400/10'
                      : 'border-ember-400/15 hover:border-ember-400/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 font-display text-sm font-medium leading-tight">
                        <span className="truncate">{l.name}</span>
                        {l.verified && (
                          <BadgeCheck size={13} strokeWidth={1.5} className="shrink-0 text-ember-400" />
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-smoke-400">
                        {l.city}, {l.state}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs tabular text-ember-100">{l.distanceMi.toFixed(1)} mi</div>
                      {l.geo === 'state' && (
                        <div className="text-[9px] uppercase tracking-wider text-smoke-500">approx</div>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/lounges/${l.slug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 inline-block text-[11px] text-ember-100 hover:underline"
                  >
                    View lounge →
                  </Link>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-smoke-400">
        Store locations are geocoded from city and state and are approximate (some pins sit at the
        city or state center). Exact rooftop coordinates come from a one-time geocode pass; verified
        partner lounges carry precise locations.
      </p>
    </div>
  );
}
