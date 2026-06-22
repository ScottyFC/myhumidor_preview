'use client';

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

async function loungeIdForSlug(slug: string): Promise<string | null> {
  try {
    const { data } = await supabaseBrowser().from('lounges').select('id').eq('slug', slug).single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function isFollowingLounge(loungeId: string): Promise<boolean> {
  bind();
  if (!isSupabaseConfigured || !userId || !loungeId) return false;
  try {
    const { data } = await supabaseBrowser().from('lounge_follows').select('lounge_id').eq('user_id', userId).eq('lounge_id', loungeId).maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export async function setLoungeFollow(loungeId: string, following: boolean): Promise<boolean> {
  bind();
  if (!isSupabaseConfigured || !userId || !loungeId) return false;
  try {
    const sb = supabaseBrowser();
    if (following) {
      const { error } = await sb.from('lounge_follows').upsert({ user_id: userId, lounge_id: loungeId }, { onConflict: 'user_id,lounge_id' });
      return !error;
    }
    const { error } = await sb.from('lounge_follows').delete().eq('user_id', userId).eq('lounge_id', loungeId);
    return !error;
  } catch {
    return false;
  }
}

export async function loungeFollowerCount(loungeId: string): Promise<number> {
  if (!isSupabaseConfigured || !loungeId) return 0;
  try {
    const { count } = await supabaseBrowser().from('lounge_follows').select('*', { count: 'exact', head: true }).eq('lounge_id', loungeId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function followerIdsForLounge(loungeId: string, limit = 500): Promise<string[]> {
  if (!isSupabaseConfigured || !loungeId) return [];
  try {
    const { data } = await supabaseBrowser().from('lounge_follows').select('user_id').eq('lounge_id', loungeId).limit(limit);
    return (data ?? []).map((r) => r.user_id as string);
  } catch {
    return [];
  }
}

export async function getFollowedLoungeIds(uid: string): Promise<string[]> {
  if (!isSupabaseConfigured || !uid) return [];
  try {
    const { data } = await supabaseBrowser().from('lounge_follows').select('lounge_id').eq('user_id', uid);
    return (data ?? []).map((r) => r.lounge_id as string);
  } catch {
    return [];
  }
}

/** Notify all followers of a lounge about a new post (honoring their settings). */
export async function notifyLoungeFollowers(loungeId: string, loungeName: string, postTitle: string, slug?: string, postId?: string) {
  const ids = await followerIdsForLounge(loungeId);
  if (ids.length === 0) return;
  let allowed = ids;
  try {
    const { data } = await supabaseBrowser().from('profiles').select('id, notify_lounges').in('id', ids);
    if (data) allowed = data.filter((p) => p.notify_lounges !== false).map((p) => p.id as string);
  } catch {
    /* fall back to notifying all */
  }
  // Link straight to the post on the lounge page (anchor) when we have both ids.
  const entityId = slug ? (postId ? `${slug}#post-${postId}` : slug) : undefined;
  for (const recipient of allowed) {
    await notify(recipient, { type: 'lounge_post', entityType: 'lounge', entityId, entityName: `${loungeName}: ${postTitle}` });
  }
}

export const resolveLoungeId = loungeIdForSlug;

export interface LoungeFollower {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  since: string;
}

/** The members who follow a lounge (most recent first). Lounge owners use this to
 *  see their audience. `lounge_follows` is publicly readable, so this works for the
 *  owner under RLS. */
export async function getLoungeFollowers(loungeId: string, limit = 200): Promise<LoungeFollower[]> {
  if (!isSupabaseConfigured || !loungeId) return [];
  try {
    const sb = supabaseBrowser();
    const { data: rows } = await sb
      .from('lounge_follows')
      .select('user_id, created_at')
      .eq('lounge_id', loungeId)
      .order('created_at', { ascending: false })
      .limit(limit);
    const order = (rows ?? []).map((r) => r.user_id as string);
    if (!order.length) return [];
    const since = new Map((rows ?? []).map((r) => [r.user_id as string, r.created_at as string]));
    const { data: profs } = await sb.from('profiles').select('id, handle, display_name, avatar_url').in('id', order);
    const byId = new Map((profs ?? []).map((p) => [p.id, p]));
    return order
      .map((id) => {
        const p = byId.get(id);
        return p ? { id, handle: p.handle as string, displayName: p.display_name as string, avatarUrl: (p.avatar_url as string) ?? null, since: since.get(id) ?? '' } : null;
      })
      .filter(Boolean) as LoungeFollower[];
  } catch {
    return [];
  }
}
