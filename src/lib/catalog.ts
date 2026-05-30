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
