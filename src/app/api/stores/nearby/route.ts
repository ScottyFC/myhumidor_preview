import { NextResponse } from 'next/server';
import { nearestStores, allStores, haversineMi, type NearbyStore } from '@/lib/catalog';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

/**
 * GET /api/stores/nearby?lat=27.95&lng=-82.46&limit=20
 * Closest lounges to a point.
 *
 * Fast path: the GIST-indexed PostGIS RPC `lounges_near` (phase27) — the index
 * walks straight to nearby rows instead of scanning + sorting in JS.
 * Fallbacks: legacy table scan (RPC missing = migration not run yet), and the
 * static directory merge so results never come back empty.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 50);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const base = nearestStores(lat, lng, limit * 2);
  let extras: NearbyStore[] = [];

  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();

      // Fast path — indexed geospatial RPC.
      const { data: near, error } = await sb.rpc('lounges_near', {
        p_lat: lat, p_lng: lng, p_radius_m: 80_000, p_limit: limit * 2,
      });

      let rows: Array<Record<string, unknown>> = [];
      if (!error && Array.isArray(near)) {
        rows = near as unknown as Array<Record<string, unknown>>;
      } else {
        // Legacy fallback (pre-phase27): bounded scan, distance computed here.
        const { data } = await sb
          .from('lounges')
          .select('slug, name, address, city, state, lat, lng, verified, certified')
          .not('lat', 'is', null)
          .not('lng', 'is', null)
          .limit(200);
        rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
      }

      const known = new Set(allStores().map((s) => s.slug));
      extras = rows
        .filter((l) => !known.has(l.slug as string))
        .map((l) => ({
          id: l.slug as string,
          slug: l.slug as string,
          name: l.name as string,
          address: (l.address as string) ?? '',
          city: (l.city as string) ?? '',
          state: (l.state as string) ?? '',
          lat: Number(l.lat),
          lng: Number(l.lng),
          verified: Boolean(l.verified) || Boolean(l.certified),
          distanceMi:
            typeof l.distance_m === 'number'
              ? (l.distance_m as number) / 1609.344
              : haversineMi(lat, lng, Number(l.lat), Number(l.lng)),
        })) as NearbyStore[];
    } catch (e) {
      console.error('[nearby] DB lookup failed:', e);
    }
  }

  const items = [...base, ...extras].sort((a, b) => a.distanceMi - b.distanceMi).slice(0, limit);
  return NextResponse.json({ items });
}
