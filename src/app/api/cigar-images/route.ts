import { NextResponse } from 'next/server';
import { findCatalogCigarBySlug } from '@/lib/catalog';
import { loadOverrides } from '@/lib/overrides';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

export interface CigarMeta {
  url: string | null;            // resolved image (product → brand → null)
  brand: string | null;         // live brand (override ?? static)
  name: string | null;          // live name (override ?? static)
  buyUrl: string | null;        // purchase link (override)
  removed: boolean;             // hidden by admin
}

/**
 * POST /api/cigar-images  { slugs: string[] }
 * Live-joins a batch of cigars by slug → { map: { [slug]: CigarMeta } }.
 * Names/brands come from catalog_overrides (admin edits) merged over the static
 * catalog, so thumbnails AND labels stay in sync everywhere without a rebuild.
 */
export async function POST(request: Request) {
  let slugs: string[] = [];
  try {
    const body = await request.json();
    slugs = Array.isArray(body?.slugs) ? body.slugs.filter((s: unknown) => typeof s === 'string').slice(0, 300) : [];
  } catch { /* ignore */ }
  if (slugs.length === 0) return NextResponse.json({ map: {} });

  const stat = new Map<string, { img?: string | null; brand?: string; name?: string }>();
  for (const s of slugs) {
    const c = findCatalogCigarBySlug(s);
    if (c) stat.set(s, { img: c.image_url ?? null, brand: c.brand, name: c.name });
  }

  const map: Record<string, CigarMeta> = {};
  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      const overrides = await loadOverrides();

      const { data: rows } = await sb.from('catalog_cigars').select('slug, image_url, brand, name').in('slug', slugs);
      const db = new Map<string, { image_url: string | null; brand: string | null; name: string | null }>();
      for (const r of (rows ?? []) as Array<{ slug: string; image_url: string | null; brand: string | null; name: string | null }>) {
        db.set(r.slug, { image_url: r.image_url, brand: r.brand, name: r.name });
      }

      const needBrand = new Set<string>();
      for (const s of slugs) {
        const o = overrides.get(s);
        const productImg = o?.image_url || db.get(s)?.image_url || stat.get(s)?.img;
        const brand = o?.brand || db.get(s)?.brand || stat.get(s)?.brand;
        if (!productImg && brand) needBrand.add(brand);
      }
      const brandImg = new Map<string, string>();
      if (needBrand.size) {
        const { data: bi } = await sb.from('brand_images').select('brand, image_url').in('brand', [...needBrand]);
        for (const b of (bi ?? []) as Array<{ brand: string; image_url: string }>) brandImg.set(b.brand, b.image_url);
      }

      for (const s of slugs) {
        const o = overrides.get(s);
        const brand = o?.brand ?? db.get(s)?.brand ?? stat.get(s)?.brand ?? null;
        const name = o?.name ?? db.get(s)?.name ?? stat.get(s)?.name ?? null;
        const productImg = o?.image_url ?? db.get(s)?.image_url ?? stat.get(s)?.img ?? null;
        const url = productImg ?? (brand ? brandImg.get(brand) ?? null : null);
        map[s] = { url, brand, name, buyUrl: o?.buy_url ?? null, removed: !!o?.removed };
      }
      return NextResponse.json({ map });
    } catch { /* fall through to static-only */ }
  }

  for (const s of slugs) {
    const c = stat.get(s);
    map[s] = { url: c?.img ?? null, brand: c?.brand ?? null, name: c?.name ?? null, buyUrl: null, removed: false };
  }
  return NextResponse.json({ map });
}
