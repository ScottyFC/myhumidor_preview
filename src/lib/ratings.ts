'use client';

/**
 * The signed-in user's cigar ratings.
 *
 * Dual-mode: Supabase `ratings` table when configured, localStorage otherwise.
 * Public API stays synchronous via an in-memory cache (reads hit the cache;
 * writes are optimistic + persisted in the background).
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth, getSession } from './auth';

export interface UserRating {
  id?: string;
  cigarId: string;
  slug: string;
  brand: string;
  name: string;
  size: string;
  flavor: number;
  burn: number;
  appearance: number;
  overall: number;
  notes?: string;
  tastingNotes?: string[];
  photoUrl?: string;
  loungeSlug?: string;
  createdAt: string;
}

const KEY = 'myhumidor:ratings';
const EVENT = 'myhumidor:ratings-change';

let cache: UserRating[] = [];
let started = false;
let userId: string | null = null;

function fire() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

/* ── localStorage (demo) ─────────────────────────────────────────────────── */
function loadLocal(): UserRating[] {
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

/* ── Supabase row mapping ────────────────────────────────────────────────── */
type Row = {
  id: string;
  cigar_id: string;
  slug: string | null;
  brand: string | null;
  name: string | null;
  size: string | null;
  flavor_score: number;
  burn_score: number;
  appearance_score: number;
  overall: number;
  notes: string | null;
  tasting_notes: string[] | null;
  photo_url?: string | null;
  lounge_slug?: string | null;
  created_at: string | null;
};

function rowToRating(r: Row): UserRating {
  return {
    id: r.id,
    cigarId: r.cigar_id,
    slug: r.slug ?? '',
    brand: r.brand ?? '',
    name: r.name ?? '',
    size: r.size ?? '',
    flavor: r.flavor_score,
    burn: r.burn_score,
    appearance: r.appearance_score,
    overall: Number(r.overall),
    notes: r.notes ?? undefined,
    tastingNotes: r.tasting_notes ?? [],
    photoUrl: (r as { photo_url?: string }).photo_url ?? undefined,
    loungeSlug: (r as { lounge_slug?: string }).lounge_slug ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

const SELECT =
  'id, cigar_id, slug, brand, name, size, flavor_score, burn_score, appearance_score, overall, notes, tasting_notes, photo_url, lounge_slug, created_at';

async function hydrateRemote() {
  try {
    const { data, error } = await supabaseBrowser()
      .from('ratings')
      .select(SELECT)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[ratings] load failed:', error.message);
      return;
    }
    cache = ((data ?? []) as Row[]).map((r) => rowToRating(r));
    fire();
  } catch (e) {
    console.error('[ratings] load error:', e);
  }
}

function persist(rating: UserRating) {
  if (!isSupabaseConfigured) return saveLocal();
  const uid = userId ?? getSession()?.uuid ?? null;
  if (!uid) return;
  // Append-only: every rating is its own row (re-rating a cigar later is a new
  // rating, never an edit). id is generated client-side so the optimistic row
  // and a later delete reference the same primary key.
  supabaseBrowser()
    .from('ratings')
    .insert({
      id: rating.id,
      user_id: uid,
      cigar_id: rating.cigarId,
      slug: rating.slug,
      brand: rating.brand,
      name: rating.name,
      size: rating.size,
      flavor_score: rating.flavor,
      burn_score: rating.burn,
      appearance_score: rating.appearance,
      overall: rating.overall,
      notes: rating.notes ?? null,
      tasting_notes: rating.tastingNotes ?? [],
      photo_url: rating.photoUrl ?? null,
      lounge_slug: rating.loungeSlug ?? null,
    })
    .then((r: { error: { message: string } | null }) => { if (r.error) { console.error('[ratings] save failed:', r.error.message) } });
}

function persistDelete(id: string) {
  if (!isSupabaseConfigured) return saveLocal();
  // RLS scopes deletes to the current user, so deleting by id alone removes only
  // the user's own rating — no dependency on the module userId being populated.
  supabaseBrowser()
    .from('ratings')
    .delete()
    .eq('id', id)
    .then((r: { error: { message: string } | null }) => { if (r.error) { console.error('[ratings] delete failed:', r.error.message) } });
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
  } else {
    cache = loadLocal();
  }
}

/* ── public API (unchanged signatures) ───────────────────────────────────── */
export function getRatings(): UserRating[] {
  start();
  if (!isSupabaseConfigured && cache.length === 0) cache = loadLocal();
  return [...cache].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRating(cigarId: string): UserRating | null {
  start();
  if (!isSupabaseConfigured && cache.length === 0) cache = loadLocal();
  // Most recent rating for this cigar (used for "you've rated this" displays).
  return cache.find((r) => r.cigarId === cigarId) ?? null;
}

/** Add a NEW rating (append-only — never edits an existing one). */
export function setRating(rating: UserRating) {
  start();
  const withId: UserRating = { ...rating, id: rating.id ?? newRatingId() };
  cache = [withId, ...cache];
  fire();
  persist(withId);
}

/** Remove one of the user's ratings by id. */
export function removeRating(id: string) {
  start();
  cache = cache.filter((r) => r.id !== id);
  fire();
  persistDelete(id);
}

function newRatingId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* fall through */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function onRatingsChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  start();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/** Fetch another member's public ratings (for /u/[handle]). Supabase only. */
export async function fetchRatingsFor(userId: string): Promise<UserRating[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabaseBrowser()
      .from('ratings')
      .select(SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[ratings] fetchFor failed:', error.message);
      return [];
    }
    return ((data ?? []) as Row[]).map((r) => rowToRating(r));
  } catch {
    return [];
  }
}


/** Photos uploaded with ratings of a given cigar (newest first) — for the
 *  "Photos of This Cigar" carousel. Returns [] when Supabase isn't configured. */
export async function fetchRatingPhotos(slug: string): Promise<Array<{ url: string; handle?: string }>> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabaseBrowser()
      .from('ratings')
      .select('photo_url, created_at')
      .eq('slug', slug)
      .not('photo_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) return [];
    return (data ?? []).map((r) => ({ url: (r as { photo_url: string }).photo_url }));
  } catch {
    return [];
  }
}

/** Upload a review photo to storage, return its public URL. */
export async function uploadRatingPhoto(dataUrl: string): Promise<string | null> {
  if (!isSupabaseConfigured || !dataUrl.startsWith('data:')) return null;
  try {
    const sb = supabaseBrowser();
    const blob = await (await fetch(dataUrl)).blob();
    const path = `rating-photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await sb.storage.from('avatars').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
    if (error) { console.error('[ratings] photo upload failed:', error.message); return null; }
    return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  } catch { return null; }
}
export interface CommunityReview {
  id: string;
  userId?: string;
  handle?: string;
  displayName: string;
  avatarUrl?: string;
  aficionado: boolean;
  overall: number;
  flavor: number;
  burn: number;
  appearance: number;
  notes?: string;
  tastingNotes: string[];
  photoUrl?: string;
  createdAt: string;
}

/** All members' reviews of a cigar (by slug), newest first — for the cigar page. */
export async function fetchCigarReviews(slug: string, limit = 50): Promise<CommunityReview[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabaseBrowser()
      .from('ratings')
      .select('id, user_id, overall, flavor_score, burn_score, appearance_score, notes, tasting_notes, photo_url, created_at, profiles(handle, display_name, avatar_url, aficionado)')
      .eq('slug', slug)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const p = (r.profiles ?? {}) as Record<string, unknown>;
      return {
        id: String(r.id),
        userId: (r.user_id as string) ?? undefined,
        handle: (p.handle as string) ?? undefined,
        displayName: (p.display_name as string) ?? 'Member',
        avatarUrl: (p.avatar_url as string) ?? undefined,
        aficionado: !!p.aficionado,
        overall: Number(r.overall),
        flavor: Number(r.flavor_score),
        burn: Number(r.burn_score),
        appearance: Number(r.appearance_score),
        notes: (r.notes as string) ?? undefined,
        tastingNotes: (r.tasting_notes as string[]) ?? [],
        photoUrl: (r.photo_url as string) ?? undefined,
        createdAt: (r.created_at as string) ?? new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}
