import { NextResponse } from 'next/server';
import { haversineMi } from '@/lib/catalog';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

const RADIUS_MI = 25;

/**
 * GET /api/cigars/{slug}/nearby?lat=&lng=
 * Certified lounges within 25 miles that carry (and have published) this cigar.
 * Certified-only is enforced here. Matches inventory by slug.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') ?? '');
  const lng = parseFloat(searchParams.get('lng') ?? '');
  if (Number.isNaN(lat) || Number.isNaN(lng)) return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  if (!isSupabaseConfigured) return NextResponse.json({ items: [] });

  try {
    const sb = await supabaseServer();
    const { data, error } = await sb
      .from('inventory_items')
      .select('price, in_stock, published, lounges!inner(slug, name, address, city, state, lat, lng, certified)')
      .eq('slug', slug)
      .eq('published', true);
    if (error) return NextResponse.json({ items: [] });

    type Row = { price: number | null; in_stock: boolean | null; lounges: { slug: string; name: string; address: string | null; city: string | null; state: string | null; lat: number | null; lng: number | null; certified: boolean | null } };
    const items = ((data ?? []) as unknown as Row[])
      .filter((r) => r.lounges?.certified && r.lounges.lat != null && r.lounges.lng != null)
      .map((r) => ({
        slug: r.lounges.slug,
        name: r.lounges.name,
        address: [r.lounges.address, r.lounges.city, r.lounges.state].filter(Boolean).join(', '),
        price: r.price,
        inStock: r.in_stock !== false,
        distanceMi: haversineMi(lat, lng, Number(r.lounges.lat), Number(r.lounges.lng)),
      }))
      .filter((x) => x.distanceMi <= RADIUS_MI)
      .sort((a, b) => a.distanceMi - b.distanceMi)
      .slice(0, 12);

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
