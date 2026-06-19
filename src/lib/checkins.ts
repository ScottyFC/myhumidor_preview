'use client';
import { awardLoungeBadgesOnCheckin } from '@/lib/badges';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';
import { notify } from './notifications';

let userId: string | null = null;
let bound = false;
function bind() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  subscribeAuth((s) => (userId = s?.uuid ?? null));
}

export interface CheckIn {
  id: string;
  userId: string;
  userHandle?: string;
  userName?: string;
  userAvatar?: string;
  cigarSlug?: string;
  cigarBrand?: string;
  cigarName?: string;
  loungeId?: string;
  loungeSlug?: string;
  loungeName?: string;
  rating?: number;
  review?: string;
  photoUrl?: string;
  createdAt: string;
}

type Row = {
  id: string; user_id: string; cigar_slug: string | null; cigar_brand: string | null; cigar_name: string | null;
  lounge_id: string | null; lounge_slug: string | null; lounge_name: string | null;
  rating: number | null; review: string | null; photo_url: string | null; created_at: string | null;
  profiles?: { handle: string; display_name: string; avatar_url: string | null } | null;
};
function rowTo(r: Row): CheckIn {
  return {
    id: r.id, userId: r.user_id,
    userHandle: r.profiles?.handle, userName: r.profiles?.display_name, userAvatar: r.profiles?.avatar_url ?? undefined,
    cigarSlug: r.cigar_slug ?? undefined, cigarBrand: r.cigar_brand ?? undefined, cigarName: r.cigar_name ?? undefined,
    loungeId: r.lounge_id ?? undefined, loungeSlug: r.lounge_slug ?? undefined, loungeName: r.lounge_name ?? undefined,
    rating: r.rating ?? undefined, review: r.review ?? undefined, photoUrl: r.photo_url ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}
const SELECT =
  'id, user_id, cigar_slug, cigar_brand, cigar_name, lounge_id, lounge_slug, lounge_name, rating, review, photo_url, created_at, profiles!check_ins_user_id_fkey(handle, display_name, avatar_url)';

export async function createCheckIn(input: {
  cigarSlug?: string; cigarBrand?: string; cigarName?: string;
  loungeSlug?: string; loungeName?: string;
  rating?: number; review?: string; photoDataUrl?: string;
}): Promise<boolean> {
  bind();
  if (!isSupabaseConfigured) return false;
  if (!userId) {
    try {
      const { data } = await supabaseBrowser().auth.getUser();
      userId = data.user?.id ?? null;
    } catch { /* ignore */ }
  }
  if (!userId) return false;
  try {
    const sb = supabaseBrowser();
    let loungeId: string | null = null;
    if (input.loungeSlug) {
      const { data: l } = await sb.from('lounges').select('id').eq('slug', input.loungeSlug).single();
      loungeId = l?.id ?? null;
    }
    let photoUrl: string | null = null;
    if (input.photoDataUrl) {
      const blob = await (await fetch(input.photoDataUrl)).blob();
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const path = `checkins/${userId}-${Date.now()}.${ext}`;
      const up = await sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: blob.type });
      if (!up.error) photoUrl = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    }
    const { error } = await sb.from('check_ins').insert({
      user_id: userId,
      cigar_slug: input.cigarSlug ?? null,
      cigar_brand: input.cigarBrand ?? null,
      cigar_name: input.cigarName ?? null,
      lounge_id: loungeId,
      lounge_slug: input.loungeSlug ?? null,
      lounge_name: input.loungeName ?? null,
      rating: input.rating ?? null,
      review: input.review ?? null,
      photo_url: photoUrl,
    });
    if (error) {
      console.error('[checkins] create failed:', error.message);
      return false;
    }
    // Notify the lounge owner(s) that someone checked in.
    if (loungeId) {
      try {
        const { data: members } = await sb.from('lounge_members').select('user_id').eq('lounge_id', loungeId);
        const name = [input.cigarBrand, input.cigarName].filter(Boolean).join(' ');
        for (const m of members ?? []) {
          await notify(m.user_id as string, { type: 'check_in', entityType: 'lounge', entityId: input.loungeSlug, entityName: name });
        }
      } catch {
        /* non-critical */
      }
    }
    // Award the lounge's collectible badge(s) to the user.
    if (loungeId) {
      try { await awardLoungeBadgesOnCheckin(loungeId, userId); } catch { /* non-critical */ }
    }
    return true;
  } catch {
    return false;
  }
}

export async function getCheckInsForLounge(loungeId: string, limit = 30): Promise<CheckIn[]> {
  if (!isSupabaseConfigured || !loungeId) return [];
  try {
    const { data } = await supabaseBrowser().from('check_ins').select(SELECT).eq('lounge_id', loungeId).order('created_at', { ascending: false }).limit(limit);
    return (data ?? []).map((r) => rowTo(r as unknown as Row));
  } catch {
    return [];
  }
}

export async function getCheckInsForSlug(slug: string, limit = 30): Promise<CheckIn[]> {
  if (!isSupabaseConfigured || !slug) return [];
  try {
    const sb = supabaseBrowser();
    const { data: l } = await sb.from('lounges').select('id').eq('slug', slug).single();
    if (!l) return [];
    return getCheckInsForLounge(l.id, limit);
  } catch {
    return [];
  }
}

export async function getCheckInsForUser(uid: string, limit = 30): Promise<CheckIn[]> {
  if (!isSupabaseConfigured || !uid) return [];
  try {
    const { data } = await supabaseBrowser().from('check_ins').select(SELECT).eq('user_id', uid).order('created_at', { ascending: false }).limit(limit);
    return (data ?? []).map((r) => rowTo(r as unknown as Row));
  } catch {
    return [];
  }
}

/** Check-ins from a set of users (for the following feed). */
export async function getCheckInsForUsers(userIds: string[], limit = 40): Promise<CheckIn[]> {
  if (!isSupabaseConfigured || userIds.length === 0) return [];
  try {
    const { data } = await supabaseBrowser().from('check_ins').select(SELECT).in('user_id', userIds).order('created_at', { ascending: false }).limit(limit);
    return (data ?? []).map((r) => rowTo(r as unknown as Row));
  } catch {
    return [];
  }
}
