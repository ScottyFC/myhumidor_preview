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
