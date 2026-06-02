import { NextResponse } from 'next/server';
import { nearestStores, allStores, haversineMi, type NearbyStore } from '@/lib/catalog';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

/**
 * GET /api/stores/nearby?lat=27.95&lng=-82.46&limit=20
 * Closest stores to a point. Merges the static directory with member-submitted
 * lounges that have been approved + geocoded (DB rows not in the static set).
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

  // Pull recently-added DB lounges with coordinates and keep the ones not already
  // in the static directory (i.e. approved member submissions).
  let extras: NearbyStore[] = [];
  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      const { data } = await sb
        .from('lounges')
        .select('slug, name, address, city, state, lat, lng, verified, certified, created_at')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);
      const known = new Set(allStores().map((s) => s.slug));
      extras = (data ?? [])
        .filter((l) => !known.has(l.slug))
        .map((l) => ({
          id: l.slug,
          slug: l.slug,
          name: l.name,
          address: l.address ?? '',
          city: l.city ?? '',
          state: l.state ?? '',
          lat: Number(l.lat),
          lng: Number(l.lng),
          verified: (l.verified ?? false) || (l.certified ?? false),
          distanceMi: haversineMi(lat, lng, Number(l.lat), Number(l.lng)),
        })) as NearbyStore[];
    } catch (e) {
      console.error('[nearby] DB merge failed:', e);
    }
  }

  const items = [...base, ...extras].sort((a, b) => a.distanceMi - b.distanceMi).slice(0, limit);
  return NextResponse.json({ items });
}
