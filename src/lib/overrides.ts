import 'server-only';
import type { CatalogCigar } from '@/types';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

export interface CatalogOverride {
  slug: string;
  removed: boolean;
  brand?: string | null;
  name?: string | null;
  country?: string | null;
  price?: number | null;
  image_url?: string | null;
  buy_url?: string | null;
}

/** A catalog cigar after overrides, carrying the optional purchase link. */
export type MergedCigar = CatalogCigar & { buyUrl?: string | null };

let cache: { at: number; map: Map<string, CatalogOverride> } | null = null;
const TTL = 30_000; // 30s — admin edits show within half a minute, cheap reads.

/** Load all overrides keyed by slug (short-lived in-memory cache). */
export async function loadOverrides(): Promise<Map<string, CatalogOverride>> {
  if (cache && Date.now() - cache.at < TTL) return cache.map;
  const map = new Map<string, CatalogOverride>();
  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      const { data } = await sb
        .from('catalog_overrides')
        .select('slug, removed, brand, name, country, price, image_url, buy_url');
      for (const o of (data ?? []) as CatalogOverride[]) map.set(o.slug, o);
    } catch { /* ignore — fall back to no overrides */ }
  }
  cache = { at: Date.now(), map };
  return map;
}

function merge(c: CatalogCigar, o?: CatalogOverride): MergedCigar | null {
  if (!o) return c;
  if (o.removed) return null;
  return {
    ...c,
    brand: o.brand ?? c.brand,
    name: o.name ?? c.name,
    country: o.country ?? c.country,
    price: o.price ?? c.price,
    image_url: o.image_url ?? c.image_url,
    buyUrl: o.buy_url ?? null,
  };
}

/** Merge one cigar with its override. Returns null if the cigar is removed. */
export async function applyOverride(c: CatalogCigar | undefined): Promise<MergedCigar | null> {
  if (!c) return null;
  const map = await loadOverrides();
  return merge(c, map.get(c.slug));
}

/** Filter out removed cigars and apply edits to a list. */
export async function applyOverrides(list: CatalogCigar[]): Promise<MergedCigar[]> {
  const map = await loadOverrides();
  const out: MergedCigar[] = [];
  for (const c of list) {
    const m = merge(c, map.get(c.slug));
    if (m) out.push(m);
  }
  return out;
}

/** Just the set of removed slugs (for cheap filtering). */
export async function removedSlugs(): Promise<Set<string>> {
  const map = await loadOverrides();
  const s = new Set<string>();
  for (const [slug, o] of map) if (o.removed) s.add(slug);
  return s;
}
