'use client';

/**
 * User-submitted cigars awaiting review.
 *
 * Dual-mode: Supabase `cigar_submissions` when configured, localStorage
 * otherwise. RLS means a normal user's cache holds only their own submissions,
 * while an admin's cache holds the whole queue (the admin review policy). Public
 * API stays synchronous via an in-memory cache.
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';
import { subscribeTable } from './realtime';
import { logEvent } from './audit';

export interface Submission {
  id: string;
  brand: string;
  name: string;
  country: string;
  size: string;
  price: number | null;
  photoDataUrl?: string; // demo: data URL. Supabase: Storage URL.
  notes?: string;
  flavorTags?: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string | null;
  reviewerName?: string;
  catalogId?: string | null;
}

const KEY = 'myhumidor:submissions';
const EVENT = 'myhumidor:submissions-change';

let cache: Submission[] = [];
let started = false;
let userId: string | null = null;

function fire() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}
function loadLocal(): Submission[] {
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

type Row = {
  id: string;
  brand: string;
  name: string;
  country: string | null;
  size: string | null;
  price: number | null;
  photo_url: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string | null;
  reviewed_by: string | null;
  catalog_id: string | null;
};
function rowTo(r: Row): Submission {
  return {
    id: r.id,
    brand: r.brand,
    name: r.name,
    country: r.country ?? '',
    size: r.size ?? '',
    price: r.price,
    photoDataUrl: r.photo_url ?? undefined,
    notes: r.notes ?? undefined,
    status: r.status,
    createdAt: r.created_at ?? new Date().toISOString(),
    reviewedAt: (r as { reviewed_at?: string }).reviewed_at ?? undefined,
    reviewedBy: r.reviewed_by,
    catalogId: r.catalog_id,
  };
}
const SELECT = 'id, brand, name, country, size, price, photo_url, notes, status, created_at, reviewed_at, reviewed_by, catalog_id';

async function hydrateRemote() {
  try {
    const sb = supabaseBrowser();
    const { data, error } = await sb
      .from('cigar_submissions')
      .select(SELECT)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[submissions] load failed:', error.message);
      return;
    }
    const rows = ((data ?? []) as Row[]).map((r) => rowTo(r));
    // resolve reviewer names for the "decided by" note
    const ids = Array.from(new Set(rows.map((r) => r.reviewedBy).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await sb.from('profiles').select('id, handle, display_name').in('id', ids);
      const who = new Map((profs ?? []).map((p) => [p.id, p.display_name || p.handle]));
      rows.forEach((r) => {
        if (r.reviewedBy) r.reviewerName = who.get(r.reviewedBy) ?? undefined;
      });
    }
    cache = rows;
    fire();
  } catch (e) {
    console.error('[submissions] load error:', e);
  }
}

/** Best-effort photo upload to the `submissions` bucket; returns null on failure. */
async function uploadPhoto(dataUrl: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const sb = supabaseBrowser();
    const { error } = await sb.storage.from('submissions').upload(path, blob, { contentType: blob.type });
    if (error) {
      console.warn('[submissions] photo upload skipped:', error.message);
      return null;
    }
    return sb.storage.from('submissions').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

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
    // keep every reviewer's queue current → no duplicate approvals
    subscribeTable('cigar_submissions', () => {
      if (userId) hydrateRemote();
    });
  } else {
    cache = loadLocal();
  }
}

export function getSubmissions(): Submission[] {
  start();
  if (!isSupabaseConfigured && cache.length === 0) cache = loadLocal();
  return [...cache].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addSubmission(s: Omit<Submission, 'id' | 'status' | 'createdAt'>): Submission {
  start();
  const sub: Submission = {
    ...s,
    id: `sub_${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  // optimistic
  cache = [sub, ...cache];
  fire();

  if (isSupabaseConfigured && userId) {
    (async () => {
      let photo_url: string | null = null;
      if (s.photoDataUrl?.startsWith('data:')) photo_url = await uploadPhoto(s.photoDataUrl);
      const { data, error } = await supabaseBrowser()
        .from('cigar_submissions')
        .insert({
          submitted_by: userId,
          brand: s.brand,
          name: s.name,
          country: s.country || null,
          size: s.size || null,
          price: s.price,
          photo_url,
          notes: s.notes ?? null,
        })
        .select(SELECT)
        .single();
      if (error) {
        console.error('[submissions] insert failed:', error.message);
      } else if (data) {
        // swap the optimistic row for the real one (real id)
        cache = [rowTo(data as Row), ...cache.filter((x) => x.id !== sub.id)];
        fire();
      }
    })();
  } else {
    saveLocal();
  }
  return sub;
}

/** UUID with a manual v4 fallback for environments where crypto.randomUUID is
 *  unavailable (older/insecure contexts) — so id is never undefined. */
function newUuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* fall through */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'cigar';
}

/** Is this user an operator (member/owner) of a *verified* lounge? */
async function isVerifiedLoungeOperator(uid: string): Promise<boolean> {
  if (!isSupabaseConfigured || !uid) return false;
  try {
    const sb = supabaseBrowser();
    const { data } = await sb
      .from('lounge_members')
      .select('lounge_id, lounges!inner(verified)')
      .eq('user_id', uid);
    return (data ?? []).some((r) => (r as { lounges?: { verified?: boolean } }).lounges?.verified);
  } catch {
    return false;
  }
}

export interface SubmitResult {
  ok: boolean;
  slug: string;
  duplicatePending: boolean;   // someone else already has this pending
  autoApproved: boolean;       // verified lounge → pushed live immediately
  error?: string;
}

/**
 * Submit a cigar. The submitter can post about it immediately (ratings/check-ins
 * store the cigar inline), but it stays off the public catalog until approved —
 * unless a verified lounge submits it with full details, which auto-approves and
 * pushes it live (logged for traceability).
 */
export async function submitCigar(input: {
  brand: string; name: string; country?: string; size?: string; price?: number | null;
  notes?: string; photoDataUrl?: string; buyUrl?: string; flavorTags?: string[];
}): Promise<SubmitResult> {
  start();
  input = { ...input, brand: input.brand.trim().replace(/\s+/g, ' '), name: input.name.trim().replace(/\s+/g, ' ') };
  const slug = slugify(`${input.brand} ${input.name}`);
  if (!isSupabaseConfigured) {
    addSubmission({ brand: input.brand, name: input.name, country: input.country ?? '', size: input.size ?? '', price: input.price ?? null, notes: input.notes, photoDataUrl: input.photoDataUrl });
    return { ok: true, slug, duplicatePending: false, autoApproved: false };
  }
  // Auth resolves async; resolve the signed-in user directly if the cache is cold.
  if (!userId) {
    try {
      const { data } = await supabaseBrowser().auth.getUser();
      userId = data.user?.id ?? null;
    } catch { /* ignore */ }
  }
  if (!userId) {
    return { ok: false, slug, duplicatePending: false, autoApproved: false, error: 'You appear to be signed out. Please sign in and try again.' };
  }

  const sb = supabaseBrowser();
  try {
    const { data: inCatalogRow } = await sb.from('catalog_cigars').select('slug').eq('slug', slug).maybeSingle();
    // Also check the large static catalog — a cigar already there must NOT be
    // pushed again, or it shows twice (static copy + new DB copy).
    let inStatic = false;
    try {
      const res = await fetch(`/api/catalog-exists?slug=${encodeURIComponent(slug)}&brand=${encodeURIComponent(input.brand)}&name=${encodeURIComponent(input.name)}`);
      inStatic = !!(await res.json())?.exists;
    } catch { /* ignore — fall back to DB-only check */ }
    const inCatalog = !!inCatalogRow || inStatic;

    const { data: pendingRows } = await sb
      .from('cigar_submissions')
      .select('id, submitted_by, status')
      .eq('slug', slug).eq('status', 'pending');
    const duplicatePending = (pendingRows ?? []).some((r) => r.submitted_by !== userId);

    const verified = await isVerifiedLoungeOperator(userId);
    const criteriaMet = !!(input.brand && input.name && input.country && input.size);
    const autoApprove = verified && criteriaMet && !inCatalog;

    let photo_url: string | null = null;
    if (input.photoDataUrl?.startsWith('data:')) photo_url = await uploadPhoto(input.photoDataUrl);

    let catalogId: string | null = null;
    if (autoApprove) {
      catalogId = await pushToCatalog({
        id: '', brand: input.brand, name: input.name, country: input.country ?? '', size: input.size ?? '',
        price: input.price ?? null, photoDataUrl: input.photoDataUrl, flavorTags: input.flavorTags, status: 'approved', createdAt: new Date().toISOString(),
      } as Submission);
    }

    const { error } = await sb.from('cigar_submissions').insert({
      submitted_by: userId,
      brand: input.brand, name: input.name, slug,
      country: input.country || null, size: input.size || null, price: input.price ?? null,
      photo_url, notes: input.notes ?? null, buy_url: input.buyUrl ?? null,
      status: autoApprove ? 'approved' : 'pending',
      ...(catalogId ? { catalog_id: catalogId, reviewed_by: userId } : {}),
    });
    if (error) {
      console.error('[submissions] submit failed:', error.message);
      return { ok: false, slug, duplicatePending, autoApproved: false, error: error.message };
    }

    try { await sb.rpc('notify_admins', { p_type: 'submission', p_entity_name: `${input.brand} ${input.name}` }); } catch { /* non-critical */ }
    if (autoApprove && input.buyUrl) {
      try { await sb.rpc('set_catalog_override', { p_slug: slug, p_buy_url: input.buyUrl }); } catch { /* ignore */ }
    }
    if (autoApprove) {
      logEvent({
        action: 'cigar.auto_approved',
        entityType: 'cigar',
        entityId: catalogId ?? slug,
        entityName: `${input.brand} ${input.name}`,
        meta: { reason: 'verified_lounge', slug },
      });
    }
    await hydrateRemote();
    return { ok: true, slug, duplicatePending, autoApproved: autoApprove };
  } catch (e) {
    console.error('[submissions] submit error:', e);
    return { ok: false, slug, duplicatePending: false, autoApproved: false, error: 'submit failed' };
  }
}

/** Promote an approved submission into the live catalog so it's searchable.
 *  Idempotent: only inserts once (guarded by catalog_id), so two admins
 *  approving the same item can't create duplicates. */
async function pushToCatalog(sub: Submission): Promise<string | null> {
  try {
    const brand = sub.brand.trim().replace(/\s+/g, ' ');
    const name = sub.name.trim().replace(/\s+/g, ' ');
    const sb = supabaseBrowser();
    // Idempotent: if a catalog row for this brand+name already exists (case-
    // insensitive), reuse it instead of inserting a second copy. This stops the
    // duplicates a double-submit would otherwise create.
    const { data: existing } = await sb
      .from('catalog_cigars')
      .select('id')
      .ilike('brand', brand)
      .ilike('name', name)
      .limit(1)
      .maybeSingle();
    if (existing?.id) return existing.id as string;

    const id = newUuid();
    const slug = `${slugify(`${brand} ${name}`)}-${id.slice(0, 6)}`;
    const { error } = await sb.from('catalog_cigars').insert({
      id,
      brand,
      name,
      country: sub.country || null,
      size: sub.size || null,
      price: sub.price,
      slug,
      image_url: sub.photoDataUrl ?? null,
      flavor_tags: sub.flavorTags ?? [],
    });
    if (error) {
      console.error('[submissions] catalog push failed:', error.message);
      return null;
    }
    return id;
  } catch (e) {
    console.error('[submissions] catalog push error:', e);
    return null;
  }
}

export async function setSubmissionStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<{ ok: boolean; error?: string }> {
  start();
  const sub = cache.find((s) => s.id === id);
  // optimistic
  cache = cache.map((s) => (s.id === id ? { ...s, status } : s));
  fire();
  if (!isSupabaseConfigured) {
    saveLocal();
    return { ok: true };
  }
  const sb = supabaseBrowser();
  // authoritative current state — prevents a duplicate catalog insert
  const { data: fresh } = await sb
    .from('cigar_submissions')
    .select('status, catalog_id')
    .eq('id', id)
    .single();
  let catalogId: string | null = fresh?.catalog_id ?? sub?.catalogId ?? null;
  const alreadyApproved = fresh?.status === 'approved' || !!catalogId;

  if (status === 'approved' && sub && !alreadyApproved) {
    catalogId = await pushToCatalog(sub);
  }
  const { data: updated, error } = await sb
    .from('cigar_submissions')
    .update({
      status,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      ...(catalogId ? { catalog_id: catalogId } : {}),
    })
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('[submissions] review failed:', error.message);
    await hydrateRemote();
    return { ok: false, error: error.message };
  }
  if (!updated || updated.length === 0) {
    await hydrateRemote();
    return {
      ok: false,
      error: 'No rows updated — this account is not a super admin in the database (run phase10.sql and sign in as the super admin).',
    };
  }
  if (sub) {
    logEvent({
      action: status === 'approved' ? 'cigar.approved' : 'cigar.rejected',
      entityType: 'cigar',
      entityId: catalogId ?? sub.id,
      entityName: `${sub.brand} ${sub.name}`,
    });
  }
  await hydrateRemote();
  return { ok: true };
}

export function onSubmissionsChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  start();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
