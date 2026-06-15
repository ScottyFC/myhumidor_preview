/**
 * Server-only catalog access for the full datasets loaded from Cigars.csv and
 * stores.csv (23.5k cigars, 713 stores). The JSON lives in src/data and is read
 * from disk once per server instance — never shipped to the browser. Search
 * results are returned to clients via the /api/cigars and /api/stores routes.
 *
 * In production this layer is replaced by Supabase queries against the
 * `catalog_cigars` and `lounges` tables (see supabase/seed/ to import the data).
 *
 * IMPORTANT: only import this from server components or route handlers. It uses
 * `fs`, so importing it into a client component will fail the build (a useful
 * guard against accidentally shipping 4.7MB to the browser).
 */

import 'server-only';
import fs from 'fs';
import path from 'path';
import type { CatalogCigar, CatalogStore } from '@/types';

let cigarsCache: CatalogCigar[] | null = null;
let storesCache: CatalogStore[] | null = null;

function load<T>(file: string): T[] {
  const full = path.join(process.cwd(), 'src', 'data', file);
  return JSON.parse(fs.readFileSync(full, 'utf-8')) as T[];
}

export function allCigars(): CatalogCigar[] {
  if (!cigarsCache) cigarsCache = load<CatalogCigar>('cigars.json');
  return cigarsCache;
}

export function allStores(): CatalogStore[] {
  if (!storesCache) storesCache = load<CatalogStore>('stores.json');
  return storesCache;
}

export interface SearchResult<T> {
  total: number;
  items: T[];
}

/**
 * Search cigars by brand or name. Cheap substring match — fine for a few
 * thousand records server-side. Postgres full-text takes over in production.
 */
export function searchCigars(query: string, limit = 25, offset = 0): SearchResult<CatalogCigar> {
  const q = query.trim().toLowerCase();
  const source = allCigars();
  const matched = q
    ? source.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.brand.toLowerCase().includes(q)
      )
    : source;
  return { total: matched.length, items: matched.slice(offset, offset + limit) };
}

export function findCatalogCigar(uuid: string): CatalogCigar | undefined {
  return allCigars().find((c) => c.uuid === uuid);
}

export function findCatalogCigarBySlug(slug: string): CatalogCigar | undefined {
  return allCigars().find((c) => c.slug === slug);
}

/** Other cigars from the same brand (excludes the current one). */
export function moreFromBrand(slug: string, limit = 12): CatalogCigar[] {
  const cur = findCatalogCigarBySlug(slug);
  if (!cur) return [];
  const bk = brandSlug(cur.brand);
  return allCigars().filter((c) => c.slug !== slug && brandSlug(c.brand) === bk).slice(0, limit);
}

/**
 * Cigars similar to this one — same country and/or overlapping flavor_tags,
 * from *other* brands, scored by tag overlap then country, price proximity as a
 * tiebreaker. Falls back to same-country when the cigar has no tags.
 */
export function similarCigars(slug: string, limit = 12): CatalogCigar[] {
  const cur = findCatalogCigarBySlug(slug);
  if (!cur) return [];
  const bk = brandSlug(cur.brand);
  const tags = new Set((cur.flavor_tags ?? []).map((t) => t.toLowerCase()));
  const country = (cur.country ?? '').toLowerCase();
  const price = typeof cur.price === 'number' ? cur.price : null;

  const scored: Array<{ c: CatalogCigar; s: number }> = [];
  for (const c of allCigars()) {
    if (c.slug === slug || brandSlug(c.brand) === bk) continue;
    let s = 0;
    if (tags.size) {
      const overlap = (c.flavor_tags ?? []).filter((t) => tags.has(t.toLowerCase())).length;
      s += overlap * 3;
    }
    if (country && (c.country ?? '').toLowerCase() === country) s += 2;
    if (price != null && typeof c.price === 'number') s += Math.max(0, 1 - Math.abs(c.price - price) / Math.max(price, 1));
    if (s > 0.5) scored.push({ c, s });
  }
  scored.sort((a, b) => b.s - a.s);

  // diversify: max 1 per brand
  const out: CatalogCigar[] = [];
  const seen = new Set<string>();
  for (const { c } of scored) {
    const k = brandSlug(c.brand);
    if (seen.has(k)) continue;
    seen.add(k); out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

/** Stable slug for a brand name (used by /brands/[slug]). */
export function brandSlug(brand: string): string {
  return (brand || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * All catalog cigars for a brand, looked up by its slug. Returns the canonical
 * brand label (first match) plus every cigar under it, sorted by name.
 */
export function cigarsByBrand(slug: string): { brand: string | null; cigars: CatalogCigar[] } {
  const matches = allCigars().filter((c) => brandSlug(c.brand) === slug);
  if (matches.length === 0) return { brand: null, cigars: [] };
  matches.sort((a, b) => a.name.localeCompare(b.name));
  return { brand: matches[0].brand, cigars: matches };
}

export function searchStores(query: string, limit = 25, offset = 0): SearchResult<CatalogStore> {
  const q = query.trim().toLowerCase();
  const source = allStores();
  const matched = q
    ? source.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q)
      )
    : source;
  return { total: matched.length, items: matched.slice(offset, offset + limit) };
}

export function catalogStats() {
  return { cigars: allCigars().length, stores: allStores().length };
}

/** Featured cigars for the home carousel — one per brand so logos don't repeat. */
/** Day-of-epoch — changes once per day, so featured picks rotate daily. */
function daySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

export function featuredCigars(limit = 12): CatalogCigar[] {
  const withImg = allCigars().filter((c) => c.image_url);
  // Keep only the first cigar of each brand (one logo per brand).
  const byBrand = new Map<string, CatalogCigar>();
  for (const c of withImg) if (!byBrand.has(c.brand)) byBrand.set(c.brand, c);
  const brands = [...byBrand.values()];
  // Rotate the starting point each day, then spread across the alphabet.
  const offset = daySeed() % Math.max(1, brands.length);
  const step = Math.max(1, Math.floor(brands.length / limit));
  const picks: CatalogCigar[] = [];
  for (let i = 0; i < brands.length && picks.length < limit; i += step) {
    picks.push(brands[(i + offset) % brands.length]);
  }
  return picks;
}

export function findCatalogStoreBySlug(slug: string): CatalogStore | undefined {
  return allStores().find((s) => s.slug === slug);
}

/** Real lounges for the directory / featured carousel (from the seeded data). */
export function featuredLounges(limit = 8): CatalogStore[] {
  const stores = allStores();
  const usable = stores.filter((s) => s.lat && s.lng);
  const pool = usable.length >= limit ? usable : stores;
  const offset = daySeed() % Math.max(1, pool.length);
  const step = Math.max(1, Math.floor(pool.length / limit));
  const picks: CatalogStore[] = [];
  for (let i = 0; i < pool.length && picks.length < limit; i += step) {
    picks.push(pool[(i + offset) % pool.length]);
  }
  return picks;
}

export function browseLounges(limit = 50): CatalogStore[] {
  return allStores().slice(0, limit);
}

/**
 * Lounges in a rotation that reshuffles every few hours, so the directory
 * doesn't ossify — every lounge gets time on top. Deterministic within each
 * window (seeded by the 4-hour bucket) so SSR and client agree.
 */
export function rotatingLounges(limit = 60, windowHours = 4): CatalogStore[] {
  const seed = Math.floor(Date.now() / (windowHours * 3600_000));
  const arr = [...allStores()];
  // Mulberry32 — tiny seeded PRNG; stable across server renders in a window.
  let a = seed >>> 0;
  const rand = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, limit);
}

export interface NearbyStore extends CatalogStore {
  distanceMi: number;
}

export function haversineMi(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8; // miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Stores nearest to a point, closest first. Server-side haversine over the
 *  geocoded catalog; PostGIS ST_Distance replaces this in production. */
export function nearestStores(lat: number, lng: number, limit = 20): NearbyStore[] {
  return allStores()
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({ ...s, distanceMi: haversineMi(lat, lng, s.lat as number, s.lng as number) }))
    .sort((a, b) => a.distanceMi - b.distanceMi)
    .slice(0, limit);
}
