import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

/**
 * GET /api/cigars/[slug]/stock-near?lat=..&lng=..&radius=40000
 * Live stock lookup: which lounges near this point have the cigar in stock
 * right now. Backed by the GIST-indexed `cigar_stock_near` RPC (phase27);
 * stock freshness comes from inventory_items.updated_at, which clients can
 * also subscribe to via Supabase realtime for push updates.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  const radius = Math.min(parseInt(searchParams.get('radius') ?? '40000', 10) || 40000, 200_000);
  if (!slug || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'slug, lat and lng are required' }, { status: 400 });
  }
  if (!isSupabaseConfigured) return NextResponse.json({ items: [] });

  try {
    const sb = await supabaseServer();
    const { data, error } = await sb.rpc('cigar_stock_near', {
      p_slug: slug, p_lat: lat, p_lng: lng, p_radius_m: radius, p_limit: 25,
    });
    if (error) {
      console.error('[stock-near] rpc failed:', error.message);
      return NextResponse.json({ items: [] });
    }
    const items = ((data ?? []) as SbRow[]).map((r: Record<string, unknown>) => ({
      loungeSlug: r.lounge_slug,
      loungeName: r.lounge_name,
      city: r.city,
      state: r.state,
      price: r.price !== null ? Number(r.price) : null,
      inStock: Boolean(r.in_stock),
      updatedAt: r.stock_updated_at,
      distanceMi: typeof r.distance_m === 'number' ? (r.distance_m as number) / 1609.344 : null,
    }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
