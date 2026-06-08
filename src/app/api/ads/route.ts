import { NextResponse } from 'next/server';
import { supabaseService, supabaseServer, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SELECT = 'id, advertiser, headline, subtext, qr_url, image_url, lat, lng, radius_km, weight, starts_at, ends_at, active';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * GET /api/ads?lat=&lng=
 * Returns currently-live ad spots in the shape the TV app expects:
 *   { ads: [{ id, headline, subtext, qrUrl, lat, lng, radiusKm }] }
 *
 * Reads via the service-role client when SUPABASE_SERVICE_KEY is set (server
 * env only); otherwise falls back to the anon client, which can still read live
 * spots thanks to the "read live ad spots" RLS policy. If lat/lng are supplied,
 * geo-scoped spots are filtered here too (the client also filters as a backstop).
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ ads: [] });

  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const hasLoc = Number.isFinite(lat) && Number.isFinite(lng);

  const sb = supabaseService() ?? (await supabaseServer());
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from('ad_spots')
    .select(SELECT)
    .eq('active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('weight', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ads: [], error: error.message }, { status: 200 });
  }

  const ads = (data ?? [])
    .filter((s) => {
      const la = s.lat as number | null, ln = s.lng as number | null, r = s.radius_km as number | null;
      if (la == null || ln == null || r == null) return true;     // global spot
      if (!hasLoc) return false;                                   // geo spot needs a fix
      return haversineKm(lat, lng, la, ln) <= r;
    })
    .map((s) => ({
      id: s.id,
      advertiser: s.advertiser ?? undefined,
      headline: s.headline,
      subtext: s.subtext ?? '',
      qrUrl: s.qr_url ?? undefined,
      imageUrl: s.image_url ?? undefined,
      lat: s.lat ?? undefined,
      lng: s.lng ?? undefined,
      radiusKm: s.radius_km ?? undefined,
      weight: s.weight ?? 1,
    }));

  return NextResponse.json({ ads }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
