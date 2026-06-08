import { NextResponse } from 'next/server';
import { supabaseService, supabaseServer, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ads/impression  { adId, deviceId?, loungeId? }
 * Records that an ad spot was displayed. Best-effort analytics for the ad
 * business — never blocks playback. Uses the service client when available.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true });
  let body: { adId?: string; deviceId?: string; loungeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 });
  }
  if (!body.adId) return NextResponse.json({ ok: false, error: 'adId required' }, { status: 400 });

  const sb = supabaseService() ?? (await supabaseServer());
  const { error } = await sb.from('ad_impressions').insert({
    ad_id: body.adId,
    device_id: body.deviceId ?? null,
    lounge_id: body.loungeId ?? null,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  return NextResponse.json({ ok: true });
}
