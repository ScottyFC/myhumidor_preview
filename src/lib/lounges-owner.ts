'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';
import { ensureProfile } from './profile';
import { subscribeTable } from './realtime';
import { logEvent } from './audit';

let userId: string | null = null;
let bound = false;
function bind() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  subscribeAuth((s) => {
    userId = s?.uuid ?? null;
  });
}

export interface MyLounge {
  loungeId: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  credits: number;
  verified: boolean;
  certified: boolean;
  certTier: CertTier;
  role: 'owner' | 'manager' | 'staff';
}

export type CertTier = 'none' | 'starter' | 'pro' | 'premier';

export interface LoungeClaim {
  id: string;
  loungeId?: string;
  loungeSlug: string;
  loungeName: string;
  userId?: string;
  claimantName: string;
  roleRequested?: string;
  email?: string;
  phone?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

/* ── Claims ──────────────────────────────────────────────────────────────── */
export async function submitClaim(input: {
  loungeSlug: string;
  loungeName: string;
  claimantName: string;
  roleRequested: string;
  email: string;
  phone?: string;
}): Promise<boolean> {
  bind();
  if (!isSupabaseConfigured || !userId) return false;
  try {
    const sb = supabaseBrowser();
    await ensureProfile();
    const { data: l } = await sb.from('lounges').select('id').eq('slug', input.loungeSlug).single();
    const { error } = await sb.from('lounge_claims').insert({
      lounge_id: l?.id ?? null,
      lounge_slug: input.loungeSlug,
      lounge_name: input.loungeName,
      user_id: userId,
      claimant_name: input.claimantName,
      role_requested: input.roleRequested,
      email: input.email,
      phone: input.phone ?? null,
    });
    if (error) {
      console.error('[claims] submit failed:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

type ClaimRow = {
  id: string; lounge_id: string | null; lounge_slug: string; lounge_name: string;
  user_id: string | null; claimant_name: string | null; role_requested: string | null;
  email: string | null; phone: string | null; status: 'pending' | 'approved' | 'rejected';
  created_at: string | null;
};
function claimRowTo(r: ClaimRow): LoungeClaim {
  return {
    id: r.id, loungeId: r.lounge_id ?? undefined, loungeSlug: r.lounge_slug, loungeName: r.lounge_name,
    userId: r.user_id ?? undefined, claimantName: r.claimant_name ?? 'Someone',
    roleRequested: r.role_requested ?? undefined, email: r.email ?? undefined, phone: r.phone ?? undefined,
    status: r.status, createdAt: r.created_at ?? new Date().toISOString(),
  };
}
const CLAIM_SELECT =
  'id, lounge_id, lounge_slug, lounge_name, user_id, claimant_name, role_requested, email, phone, status, created_at';

export async function getClaims(): Promise<LoungeClaim[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data } = await supabaseBrowser()
      .from('lounge_claims')
      .select(CLAIM_SELECT)
      .order('created_at', { ascending: false });
    return (data ?? []).map((r) => claimRowTo(r as ClaimRow));
  } catch {
    return [];
  }
}

export async function setClaimStatus(claim: LoungeClaim, status: 'approved' | 'rejected'): Promise<boolean> {
  bind();
  if (!isSupabaseConfigured) return false;
  try {
    const sb = supabaseBrowser();
    if (status === 'approved' && claim.loungeId && claim.userId) {
      await sb.from('lounges').update({ owner_id: claim.userId }).eq('id', claim.loungeId);
      await sb.from('lounge_members').upsert(
        { lounge_id: claim.loungeId, user_id: claim.userId, role: 'owner' },
        { onConflict: 'lounge_id,user_id' }
      );
    }
    const { error } = await sb
      .from('lounge_claims')
      .update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq('id', claim.id);
    if (error) {
      console.error('[claims] review failed:', error.message);
      return false;
    }
    logEvent({
      action: status === 'approved' ? 'lounge.claim_approved' : 'lounge.claim_rejected',
      entityType: 'lounge',
      entityId: claim.loungeId ?? claim.loungeSlug,
      entityName: claim.loungeName,
      loungeId: claim.loungeId ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

export function subscribeClaims(cb: () => void): () => void {
  return subscribeTable('lounge_claims', cb);
}

export async function amMemberOf(slug: string): Promise<boolean> {
  bind();
  if (!isSupabaseConfigured || !userId) return false;
  try {
    const sb = supabaseBrowser();
    const { data: l } = await sb.from('lounges').select('id').eq('slug', slug).single();
    if (!l) return false;
    const { data: m } = await sb
      .from('lounge_members')
      .select('user_id')
      .eq('lounge_id', l.id)
      .eq('user_id', userId)
      .maybeSingle();
    return !!m;
  } catch {
    return false;
  }
}

/* ── Membership (the lounges a user manages) ────────────────────────────── */
export async function getMyLounges(): Promise<MyLounge[]> {
  bind();
  if (!isSupabaseConfigured || !userId) return [];
  try {
    const sb = supabaseBrowser();
    const { data: mems } = await sb.from('lounge_members').select('lounge_id, role').eq('user_id', userId);
    const roleById = new Map((mems ?? []).map((m) => [m.lounge_id, m.role]));
    const ids = new Set((mems ?? []).map((m) => m.lounge_id as string));

    // Also treat lounges you directly own (lounges.owner_id) as yours, so an owner
    // is recognized even if the membership row is missing.
    const { data: owned } = await sb.from('lounges').select('id').eq('owner_id', userId);
    for (const o of owned ?? []) {
      if (!ids.has(o.id)) { ids.add(o.id); roleById.set(o.id, 'owner'); }
    }

    if (!ids.size) return [];
    const { data: lounges } = await sb.from('lounges').select('id, slug, name, city, state, credits, verified, certified, cert_tier').in('id', Array.from(ids));
    return (lounges ?? []).map((l) => ({
      loungeId: l.id,
      slug: l.slug,
      name: l.name,
      city: l.city ?? '',
      state: l.state ?? '',
      credits: (l as { credits?: number }).credits ?? 1000,
      verified: (l as { verified?: boolean }).verified ?? false,
      certified: (l as { certified?: boolean }).certified ?? false,
      certTier: ((l as { cert_tier?: string }).cert_tier as CertTier) ?? 'none',
      role: (roleById.get(l.id) as MyLounge['role']) ?? 'manager',
    }));
  } catch {
    return [];
  }
}


/** Change the lounge's certification tier (dashboard). Server-checked membership. */
export async function setCertTier(loungeId: string, tier: CertTier): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not connected.' };
  try {
    const { error } = await supabaseBrowser().rpc('set_cert_tier', { p_lounge: loungeId, p_tier: tier });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* ── Certified-lounge detection + dashboard details (hours/food/menu) ───────── */

/** The signed-in owner's first certified lounge, or null. */
export async function getMyCertifiedLounge(): Promise<{ slug: string; name: string } | null> {
  try {
    const mine = await getMyLounges();
    const c = mine.find((l) => l.certified);
    return c ? { slug: c.slug, name: c.name } : null;
  } catch { return null; }
}

export interface LoungeHours { [day: string]: string } // e.g. { Mon: '10:00–22:00', Tue: 'Closed' }

export async function updateLoungeDetails(
  slug: string, d: { hoursJson?: LoungeHours; servesFood?: boolean; menuUrl?: string | null; hideEmail?: boolean; bannerUrl?: string | null; drinkMenuUrl?: string | null },
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabaseBrowser().rpc('update_lounge_details', {
    p_slug: slug,
    p_hours_json: (d.hoursJson ?? null) as never,
    p_serves_food: d.servesFood ?? null,
    p_menu_url: d.menuUrl ?? null,
    p_hide_email: d.hideEmail ?? null,
    p_banner_url: d.bannerUrl ?? null,
    p_drink_menu_url: d.drinkMenuUrl ?? null,
  });
  if (error) { console.error('[lounge] update details failed:', error.message); return false; }
  return true;
}

/** Upload a lounge banner image to the submissions bucket; returns a public URL. */
export async function uploadBannerImage(file: File): Promise<{ url: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { url: null, error: 'Storage isn’t configured.' };
  try {
    const sb = supabaseBrowser();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('submissions').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
    if (error) { console.error('[lounge] banner upload failed:', error.message); return { url: null, error: humanizeUploadError(error.message) }; }
    const url = sb.storage.from('submissions').getPublicUrl(path).data.publicUrl;
    return { url, error: url ? null : 'Couldn’t get the uploaded file URL.' };
  } catch (e) { return { url: null, error: e instanceof Error ? e.message : 'Upload failed.' }; }
}

/** Upload a menu PDF to the submissions bucket; returns a public URL or null. */
export async function uploadMenuPdf(file: File): Promise<{ url: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { url: null, error: 'Storage isn’t configured.' };
  try {
    const sb = supabaseBrowser();
    const path = `menus/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const { error } = await sb.storage.from('submissions').upload(path, file, { contentType: file.type || 'application/pdf', upsert: true });
    if (error) { console.error('[lounge] menu upload failed:', error.message); return { url: null, error: humanizeUploadError(error.message) }; }
    const url = sb.storage.from('submissions').getPublicUrl(path).data.publicUrl;
    return { url, error: url ? null : 'Couldn’t get the uploaded file URL.' };
  } catch (e) { return { url: null, error: e instanceof Error ? e.message : 'Upload failed.' }; }
}

/** Turn raw Supabase Storage errors into something a lounge owner can act on. */
function humanizeUploadError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('bucket not found') || m.includes('not found')) return 'Upload storage isn’t set up yet (missing “submissions” bucket). Contact support.';
  if (m.includes('row-level security') || m.includes('policy') || m.includes('unauthorized') || m.includes('403')) return 'You don’t have permission to upload here. Make sure you’re signed in as the lounge owner.';
  if (m.includes('payload too large') || m.includes('exceeded') || m.includes('413')) return 'That file is too large.';
  return `Upload failed: ${msg}`;
}
