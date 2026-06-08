'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';
import { geocodeAddress } from './geocode';
import { subscribeTable } from './realtime';
import { logEvent } from './audit';

export interface LoungeSubmission {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  businessLicense?: string;
  contactName?: string;
  kind?: 'new' | 'verify';
  reviewedBy?: string | null;
  reviewerName?: string;
  loungeId?: string | null;
  claimsOwnership?: boolean;
  submittedBy?: string | null;
}

const KEY = 'myhumidor:lounge-submissions';
const EVENT = 'myhumidor:lounge-submissions-change';

let cache: LoungeSubmission[] = [];
let started = false;
let userId: string | null = null;

function fire() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}
function loadLocal(): LoungeSubmission[] {
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
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'lounge';
}

type Row = {
  id: string; name: string; address: string | null; city: string | null; state: string | null;
  phone: string | null; email: string | null; website: string | null; notes: string | null;
  status: 'pending' | 'approved' | 'rejected'; created_at: string | null;
  reviewed_by: string | null; lounge_id: string | null; claims_ownership: boolean | null;
  submitted_by: string | null;
  business_license?: string | null;
  contact_name?: string | null;
  kind?: string | null;
};
function rowTo(r: Row): LoungeSubmission {
  return {
    id: r.id, name: r.name, address: r.address ?? '', city: r.city ?? '', state: r.state ?? '',
    phone: r.phone ?? undefined, email: r.email ?? undefined, website: r.website ?? undefined,
    notes: r.notes ?? undefined, status: r.status, createdAt: r.created_at ?? new Date().toISOString(),
    reviewedBy: r.reviewed_by, loungeId: r.lounge_id, claimsOwnership: r.claims_ownership ?? false,
    submittedBy: r.submitted_by,
    businessLicense: r.business_license ?? undefined,
    contactName: r.contact_name ?? undefined,
    kind: (r.kind as 'new' | 'verify') ?? 'new',
  };
}
const SELECT = 'id, name, address, city, state, phone, email, website, notes, status, created_at, reviewed_by, lounge_id, claims_ownership, submitted_by, business_license, contact_name, kind';

async function hydrateRemote() {
  try {
    const sb = supabaseBrowser();
    const { data, error } = await sb
      .from('lounge_submissions')
      .select(SELECT)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[lounge-sub] load failed:', error.message);
      return;
    }
    const rows = (data ?? []).map((r) => rowTo(r as Row));
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
    console.error('[lounge-sub] load error:', e);
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
    subscribeTable('lounge_submissions', () => {
      if (userId) hydrateRemote();
    });
  } else {
    cache = loadLocal();
  }
}

export function getLoungeSubmissions(): LoungeSubmission[] {
  start();
  if (!isSupabaseConfigured && cache.length === 0) cache = loadLocal();
  return [...cache].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function submitLounge(
  f: Omit<LoungeSubmission, 'id' | 'status' | 'createdAt'>
): Promise<{ ok: boolean; error?: string }> {
  start();
  const sub: LoungeSubmission = { ...f, id: `lsub_${Date.now()}`, status: 'pending', createdAt: new Date().toISOString() };
  cache = [sub, ...cache];
  fire();
  if (isSupabaseConfigured) {
    // The module's cached userId may not be hydrated yet (auth resolves async),
    // so resolve the signed-in user directly to avoid a false "not signed in".
    let uid = userId;
    if (!uid) {
      try {
        const { data } = await supabaseBrowser().auth.getUser();
        uid = data.user?.id ?? null;
        if (uid) userId = uid;
      } catch {
        /* ignore */
      }
    }
    if (!uid) {
      cache = cache.filter((x) => x.id !== sub.id);
      fire();
      return { ok: false, error: 'You appear to be signed out. Please sign in and try again.' };
    }
    const { data, error } = await supabaseBrowser()
      .from('lounge_submissions')
      .insert({
        submitted_by: uid,
        name: f.name,
        address: f.address || null,
        city: f.city || null,
        state: f.state || null,
        phone: f.phone || null,
        email: f.email || null,
        website: f.website || null,
        notes: f.notes || null,
        claims_ownership: f.claimsOwnership ?? false,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error('[lounge-sub] insert failed:', error.message);
      cache = cache.filter((x) => x.id !== sub.id);
      fire();
      return { ok: false, error: error.message };
    }
    if (data) {
      cache = [rowTo(data as Row), ...cache.filter((x) => x.id !== sub.id)];
      fire();
    }
    return { ok: true };
  }
  saveLocal();
  return { ok: true };
}

/** Verify/certify request: a lounge owner submits verifiable business details for
 *  admin review. Recorded in lounge_submissions with kind='verify' so it appears
 *  in the same admin queue; approving it verifies (and links ownership of) the lounge. */
export async function requestVerification(f: {
  name: string; address?: string; city?: string; state?: string; phone?: string;
  email?: string; website?: string; businessLicense?: string; contactName?: string; notes?: string;
}): Promise<{ ok: boolean; error?: string }> {
  start();
  if (!isSupabaseConfigured) return { ok: true };
  let uid = userId;
  if (!uid) {
    try {
      const { data } = await supabaseBrowser().auth.getUser();
      uid = data.user?.id ?? null;
      if (uid) userId = uid;
    } catch { /* ignore */ }
  }
  if (!uid) return { ok: false, error: 'You appear to be signed out. Please sign in and try again.' };
  const { error } = await supabaseBrowser().from('lounge_submissions').insert({
    submitted_by: uid,
    name: f.name,
    address: f.address || null,
    city: f.city || null,
    state: f.state || null,
    phone: f.phone || null,
    email: f.email || null,
    website: f.website || null,
    business_license: f.businessLicense || null,
    contact_name: f.contactName || null,
    notes: f.notes || null,
    claims_ownership: true,
    kind: 'verify',
  });
  if (error) {
    console.error('[lounge-verify] insert failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function pushToLounges(sub: LoungeSubmission): Promise<string | null> {
  try {
    const slug = `${slugify(sub.name)}-${Math.random().toString(36).slice(2, 7)}`;
    const coords = await geocodeAddress({
      name: sub.name,
      address: sub.address,
      city: sub.city,
      state: sub.state,
    });
    const owns = sub.claimsOwnership === true;
    const sb = supabaseBrowser();
    const { data, error } = await sb
      .from('lounges')
      .insert({
        slug,
        name: sub.name,
        address: sub.address || null,
        city: sub.city || '',
        state: sub.state || '',
        phone: sub.phone || null,
        email: sub.email || null,
        website: sub.website || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        // submitter-owned lounges are verified + assigned on approval
        verified: owns,
        certified: false,
        owner_id: owns ? sub.submittedBy ?? null : null,
      })
      .select('id')
      .single();
    if (error) {
      console.error('[lounge-sub] push to lounges failed:', error.message);
      return null;
    }
    const newId = data?.id ?? null;
    // If the submitter claimed ownership, make them an owner-level member.
    if (owns && newId && sub.submittedBy) {
      await sb.from('lounge_members').upsert(
        { lounge_id: newId, user_id: sub.submittedBy, role: 'owner' },
        { onConflict: 'lounge_id,user_id' }
      );
    }
    return newId;
  } catch (e) {
    console.error('[lounge-sub] push error:', e);
    return null;
  }
}

export async function setLoungeSubmissionStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<{ ok: boolean; error?: string }> {
  start();
  const sub = cache.find((s) => s.id === id);
  cache = cache.map((s) => (s.id === id ? { ...s, status } : s));
  fire();
  if (!isSupabaseConfigured) {
    saveLocal();
    return { ok: true };
  }
  const sb = supabaseBrowser();
  const { data: fresh } = await sb
    .from('lounge_submissions')
    .select('status, lounge_id')
    .eq('id', id)
    .single();
  let loungeId: string | null = fresh?.lounge_id ?? sub?.loungeId ?? null;
  const alreadyApproved = fresh?.status === 'approved' || !!loungeId;

  if (status === 'approved' && sub && !alreadyApproved) {
    loungeId = await pushToLounges(sub);
  }
  const { data: updated, error } = await sb
    .from('lounge_submissions')
    .update({
      status,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      ...(loungeId ? { lounge_id: loungeId } : {}),
    })
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('[lounge-sub] review failed:', error.message);
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
      action: status === 'approved' ? 'lounge.approved' : 'lounge.rejected',
      entityType: 'lounge',
      entityId: loungeId ?? sub.id,
      entityName: sub.name,
      loungeId: loungeId,
    });
  }
  await hydrateRemote();
  return { ok: true };
}

export function onLoungeSubmissionsChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  start();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
