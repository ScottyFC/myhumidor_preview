import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';
import { findCatalogCigarBySlug } from '@/lib/catalog';

/**
 * POST /api/cigar-images  { slugs: string[] }
 * Resolves thumbnails in bulk following product → brand → fallback:
 *   product = catalog_cigars.image_url (admin overwrite) ?? static catalog image
 *   brand   = brand_images by the cigar's brand (only when there's no product image)
 * Returns { map: { [slug]: url|null } }. One round-trip for a whole list, so a
 * lounge/humidor/Top page reflects admin image changes without N requests.
 */
export async function POST(request: Request) {
  let slugs: string[] = [];
  try {
    const body = await request.json();
    slugs = Array.isArray(body?.slugs) ? body.slugs.filter((s: unknown) => typeof s === 'string').slice(0, 300) : [];
  } catch { /* ignore */ }
  if (slugs.length === 0) return NextResponse.json({ map: {} });

  const map: Record<string, string | null> = {};
  // Static (build-time) catalog: product image + brand for each slug.
  const stat = new Map<string, { img?: string | null; brand?: string }>();
  for (const s of slugs) {
    const c = findCatalogCigarBySlug(s);
    if (c) stat.set(s, { img: c.image_url ?? null, brand: c.brand });
  }

  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      // DB product overwrites.
      const { data: rows } = await sb.from('catalog_cigars').select('slug, image_url').in('slug', slugs);
      const dbImg = new Map<string, string>();
      for (const r of (rows ?? []) as Array<{ slug: string; image_url: string | null }>) {
        if (r.image_url) dbImg.set(r.slug, r.image_url);
      }
      // Brands that still need a fallback (no db + no static product image).
      const needBrand = new Set<string>();
      for (const s of slugs) {
        if (!dbImg.has(s) && !stat.get(s)?.img && stat.get(s)?.brand) needBrand.add(stat.get(s)!.brand!);
      }
      const brandImg = new Map<string, string>();
      if (needBrand.size) {
        const { data: bi } = await sb.from('brand_images').select('brand, image_url').in('brand', [...needBrand]);
        for (const b of (bi ?? []) as Array<{ brand: string; image_url: string }>) brandImg.set(b.brand, b.image_url);
      }
      for (const s of slugs) {
        const brand = stat.get(s)?.brand;
        map[s] = dbImg.get(s) ?? stat.get(s)?.img ?? (brand ? brandImg.get(brand) : undefined) ?? null;
      }
      return NextResponse.json({ map });
    } catch { /* fall through to static-only */ }
  }

  for (const s of slugs) map[s] = stat.get(s)?.img ?? null;
  return NextResponse.json({ map });
}
