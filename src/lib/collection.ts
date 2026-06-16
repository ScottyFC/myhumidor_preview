'use client';

/**
 * The user's personal collection — cigars in their humidor or wishlist.
 *
 * Dual-mode: when Supabase is configured the source of truth is the
 * `humidor_entries` table (keyed to auth.uid()); otherwise it falls back to
 * localStorage for the offline demo. Either way the public API stays synchronous
 * (reads hit an in-memory cache; writes are optimistic + persisted in the
 * background) so components don't need to change.
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeTable } from './realtime';
import { subscribeAuth, getSession } from './auth';

export type CollectionStatus = 'humidor' | 'wishlist' | 'smoked';

export interface CollectionItem {
  cigarId: string;
  entryId?: string; // humidor_entries primary key (for precise deletes)
  slug: string;
  brand: string;
  name: string;
  size: string;
  status: CollectionStatus;
  addedAt: string;
}

export type CollectionSeed = Omit<CollectionItem, 'status' | 'addedAt'>;

const KEY = 'myhumidor:collection';
const EVENT = 'myhumidor:collection-change';

let cache: CollectionItem[] = [];
let started = false;
let userId: string | null = null;

function fire() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

/* ── localStorage (demo) ─────────────────────────────────────────────────── */
function loadLocal(): CollectionItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
function saveLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

/* ── Supabase ────────────────────────────────────────────────────────────── */
async function hydrateRemote() {
  try {
    const { data, error } = await supabaseBrowser()
      .from('humidor_entries')
      .select('id, cigar_id, status, brand, name, size, slug, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[collection] load failed:', error.message);
      return;
    }
    cache = ((data ?? []) as Array<{ id: string; cigar_id: string; status: string; brand: string; name: string; size: string; slug: string; created_at: string }>).map((r) => ({
      cigarId: r.cigar_id,
      entryId: r.id,
      status: r.status as CollectionStatus,
      brand: r.brand ?? '',
      name: r.name ?? '',
      size: r.size ?? '',
      slug: r.slug ?? '',
      addedAt: r.created_at ?? new Date().toISOString(),
    }));
    fire();
  } catch (e) {
    console.error('[collection] load error:', e);
  }
}

function persistUpsert(seed: CollectionSeed, status: CollectionStatus) {
  if (!isSupabaseConfigured) return saveLocal();
  const uid = userId ?? getSession()?.uuid ?? null;
  if (!uid) return;
  supabaseBrowser()
    .from('humidor_entries')
    .upsert(
      {
        user_id: uid,
        cigar_id: seed.cigarId,
        status,
        brand: seed.brand,
        name: seed.name,
        size: seed.size,
        slug: seed.slug,
      },
      { onConflict: 'user_id,cigar_id' }
    )
    .then((r: { error: { message: string } | null }) => { if (r.error) { console.error('[collection] save failed:', r.error.message) } });
}

function persistRemove(cigarId: string, entryId?: string) {
  if (!isSupabaseConfigured) return saveLocal();
  const sb = supabaseBrowser();

  // Prefer deleting by the row's primary key — removes any ambiguity about
  // cigar_id matching. The RPC returns the number of rows actually deleted; if
  // it's 0 the row wasn't owned/found, so we log loudly AND try cigar_id paths.
  const byCigar = () => {
    sb.rpc('remove_humidor_entry', { p_cigar_id: cigarId }).then((r: { data: number | null; error: { message: string } | null }) => {
      if (r.error) {
        console.error('[collection] remove rpc failed, trying direct delete:', r.error.message);
        sb.from('humidor_entries').delete().eq('cigar_id', cigarId)
          .then((d: { error: { message: string } | null }) => { if (d.error) console.error('[collection] direct delete failed:', d.error.message); });
      } else if ((r.data ?? 0) === 0) {
        console.error(`[collection] delete matched 0 rows for cigar_id=${cigarId} — the stored row's user_id may not match auth.uid(). Run the diagnostic query in docs/SUPABASE_WIRING.md.`);
      }
    });
  };

  if (entryId) {
    sb.rpc('remove_humidor_entry_by_id', { p_id: entryId }).then((r: { data: number | null; error: { message: string } | null }) => {
      if (r.error) { console.error('[collection] remove-by-id rpc failed, trying cigar_id:', r.error.message); byCigar(); }
      else if ((r.data ?? 0) === 0) { console.error(`[collection] delete-by-id matched 0 rows for id=${entryId}; trying cigar_id.`); byCigar(); }
    });
  } else {
    byCigar();
  }
}

/* ── init (lazy, once) ───────────────────────────────────────────────────── */
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (isSupabaseConfigured) {
    subscribeAuth((s) => {
      userId = s?.uuid ?? null;
      if (userId) hydrateRemote();
      else {
        cache = [];
        fire();
      }
    });
    // Keep the collection live: any change to this user's humidor_entries (from
    // this tab, another tab, or another device) re-hydrates so removals and
    // additions reflect in real time everywhere.
    subscribeTable('humidor_entries', () => { if (userId) hydrateRemote(); });
  } else {
    cache = loadLocal();
  }
}

/* ── public API (unchanged signatures) ───────────────────────────────────── */
export function getCollection(): CollectionItem[] {
  start();
  if (!isSupabaseConfigured && cache.length === 0) cache = loadLocal();
  return [...cache].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function getStatus(cigarId: string): CollectionStatus | null {
  start();
  return cache.find((i) => i.cigarId === cigarId)?.status ?? null;
}

/** Set (or clear) a cigar's status. Passing the current status again removes it. */
export function toggleStatus(seed: CollectionSeed, status: CollectionStatus): CollectionStatus | null {
  start();
  const existing = cache.find((i) => i.cigarId === seed.cigarId);
  if (existing && existing.status === status) {
    cache = cache.filter((i) => i.cigarId !== seed.cigarId);
    fire();
    persistRemove(seed.cigarId, existing?.entryId);
    return null;
  }
  cache = [{ ...seed, status, addedAt: new Date().toISOString() }, ...cache.filter((i) => i.cigarId !== seed.cigarId)];
  fire();
  persistUpsert(seed, status);
  return status;
}

/**
 * Rating a cigar means the user is/was smoking it — move it to the "Smoked"
 * list (out of humidor/wishlist). Works for cigars already saved and for
 * one-off reviews of cigars that were never in the collection.
 */
export function markSmoked(seed: CollectionSeed) {
  start();
  cache = [{ ...seed, status: 'smoked', addedAt: new Date().toISOString() }, ...cache.filter((i) => i.cigarId !== seed.cigarId)];
  fire();
  persistUpsert(seed, 'smoked');
  return 'smoked' as CollectionStatus;
}

export function remove(cigarId: string) {
  start();
  const entryId = cache.find((i) => i.cigarId === cigarId)?.entryId;
  cache = cache.filter((i) => i.cigarId !== cigarId);
  fire();
  persistRemove(cigarId, entryId);
}

export function onCollectionChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  start();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/** Fetch another member's collection (for /u/[handle]). Supabase only. */
export async function fetchCollectionFor(otherUserId: string): Promise<CollectionItem[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabaseBrowser()
      .from('humidor_entries')
      .select('id, cigar_id, status, brand, name, size, slug, created_at')
      .eq('user_id', otherUserId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[collection] fetchFor failed:', error.message);
      return [];
    }
    return ((data ?? []) as Array<{ id: string; cigar_id: string; status: string; brand: string; name: string; size: string; slug: string; created_at: string }>).map((r) => ({
      cigarId: r.cigar_id,
      entryId: r.id,
      status: r.status as CollectionStatus,
      brand: r.brand ?? '',
      name: r.name ?? '',
      size: r.size ?? '',
      slug: r.slug ?? '',
      addedAt: r.created_at ?? new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}
