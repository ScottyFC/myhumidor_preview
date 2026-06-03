'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';
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
  role: 'owner' | 'manager' | 'staff';
}

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

/* ── Membership (the lounges a user manages) ────────────────────────────── */
export async function getMyLounges(): Promise<MyLounge[]> {
  bind();
  if (!isSupabaseConfigured || !userId) return [];
  try {
    const sb = supabaseBrowser();
    const { data: mems } = await sb.from('lounge_members').select('lounge_id, role').eq('user_id', userId);
    const ids = (mems ?? []).map((m) => m.lounge_id);
    if (!ids.length) return [];
    const roleById = new Map((mems ?? []).map((m) => [m.lounge_id, m.role]));
    const { data: lounges } = await sb.from('lounges').select('id, slug, name, city, state').in('id', ids);
    return (lounges ?? []).map((l) => ({
      loungeId: l.id,
      slug: l.slug,
      name: l.name,
      city: l.city ?? '',
      state: l.state ?? '',
      role: (roleById.get(l.id) as MyLounge['role']) ?? 'manager',
    }));
  } catch {
    return [];
  }
}
