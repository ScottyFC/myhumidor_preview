import { NextResponse } from 'next/server';
import { searchStores } from '@/lib/catalog';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

/**
 * GET /api/stores?q=tampa&limit=25&offset=0
 * Searches the static directory (713 records) AND the live `lounges` table, so
 * member-submitted / newly-approved lounges (which only exist in the DB) are
 * findable too. DB matches lead, then the static directory; deduped by slug.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25', 10) || 25, 50);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0;

  const staticResult = searchStores(q, limit + offset + 25, 0);

  let dbItems: unknown[] = [];
  if (isSupabaseConfigured && q.length >= 2) {
    try {
      const sb = await supabaseServer();
      const like = `%${q}%`;
      const { data } = await sb
        .from('lounges')
        .select('id, slug, name, address, city, state, image_url, lat, lng, verified, certified')
        .or(`name.ilike.${like},city.ilike.${like},state.ilike.${like}`)
        .limit(25);
      dbItems = (data ?? []).map((l) => ({
        id: l.id, slug: l.slug, name: l.name,
        address: l.address ?? '', city: l.city ?? '', state: l.state ?? '',
        image_url: l.image_url ?? undefined, lat: l.lat ?? undefined, lng: l.lng ?? undefined,
        verified: l.verified ?? false, certified: l.certified ?? false,
      }));
    } catch {
      /* fall back to static-only */
    }
  }

  const seen = new Set<string>();
  const merged: unknown[] = [];
  for (const it of [...dbItems, ...staticResult.items]) {
    const slug = (it as { slug: string }).slug;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    merged.push(it);
  }

  return NextResponse.json({ total: merged.length, items: merged.slice(offset, offset + limit) });
}
