'use client';

import { useState } from 'react';
import { MapPin, Loader2, Check, Navigation } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { createCheckIn } from '@/lib/checkins';

const RADIUS_M = 250; // must be within ~250m of the lounge to check in

function distanceM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Check in to a lounge — only if the visitor is physically there. We compare the
 * device's GPS position to the lounge's coordinates and allow the check-in only
 * within RADIUS_M. Lounges without coordinates can't verify presence.
 */
export function LoungeCheckIn({
  slug, name, lat, lng,
}: { slug: string; name: string; lat: number | null; lng: number | null }) {
  const [signedIn, setSignedIn] = useState(false);
  const [state, setState] = useState<'idle' | 'locating' | 'toofar' | 'ready' | 'saving' | 'done'>('idle');
  const [dist, setDist] = useState<number | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => subscribeAuth((s) => setSignedIn(!!s)), []);

  const hasCoords = typeof lat === 'number' && typeof lng === 'number' && (lat !== 0 || lng !== 0);

  function locate() {
    setErr('');
    if (!navigator.geolocation) { setErr('Location isn’t available on this device.'); return; }
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = distanceM(pos.coords.latitude, pos.coords.longitude, lat as number, lng as number);
        setDist(d);
        setState(d <= RADIUS_M ? 'ready' : 'toofar');
      },
      () => { setErr('We couldn’t get your location. Allow location access and try again.'); setState('idle'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function checkIn() {
    setState('saving');
    const ok = await createCheckIn({ loungeSlug: slug, loungeName: name });
    if (ok) {
      setState('done');
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('myhumidor:checkin'));
    } else {
      setErr('Could not check in. Please try again.');
      setState('ready');
    }
  }

  if (!signedIn) return null;

  if (state === 'done') {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border-[0.5px] border-ember-400/30 bg-ember-400/5 px-4 py-2 text-sm text-ember-100">
        <Check size={15} strokeWidth={1.5} /> Checked in at {name}
      </div>
    );
  }

  return (
    <div>
      {state === 'ready' ? (
        <button onClick={checkIn} className="btn-primary text-sm">
          <Check size={15} strokeWidth={1.5} /> Confirm check-in
        </button>
      ) : (
        <button onClick={locate} disabled={!hasCoords || state === 'locating'} className="btn-primary text-sm disabled:opacity-60">
          {state === 'locating' ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} strokeWidth={1.5} />}
          {state === 'locating' ? 'Checking your location…' : 'Check in here'}
        </button>
      )}
      {!hasCoords && (
        <p className="mt-1 text-xs text-smoke-400">Check-in opens once this lounge’s location is set.</p>
      )}
      {state === 'toofar' && (
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-smoke-400">
          <Navigation size={11} strokeWidth={1.5} /> You need to be at {name} to check in
          {dist ? ` (you’re ~${dist < 1000 ? Math.round(dist) + 'm' : (dist / 1000).toFixed(1) + 'km'} away)` : ''}.
        </p>
      )}
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
    </div>
  );
}
