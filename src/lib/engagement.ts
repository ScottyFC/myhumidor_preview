'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';
import { notify } from './notifications';

export type TargetType = 'rating' | 'checkin' | 'lounge_post';

let userId: string | null = null;
let bound = false;
function bind() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  subscribeAuth((s) => (userId = s?.uuid ?? null));
}
export function currentUserId() { bind(); return userId; }

/* ── Likes ───────────────────────────────────────────────────────────────── */
export async function getLikeInfo(type: TargetType, id: string): Promise<{ count: number; mine: boolean }> {
  bind();
  if (!isSupabaseConfigured || !id) return { count: 0, mine: false };
  try {
    const sb = supabaseBrowser();
    const { count } = await sb.from('likes').select('*', { count: 'exact', head: true }).eq('target_type', type).eq('target_id', id);
    let mine = false;
    if (userId) {
      const { data } = await sb.from('likes').select('user_id').eq('target_type', type).eq('target_id', id).eq('user_id', userId).maybeSingle();
      mine = !!data;
    }
    return { count: count ?? 0, mine };
  } catch {
    return { count: 0, mine: false };
  }
}

export async function toggleLike(type: TargetType, id: string, opts: { ownerId?: string; entityName?: string } = {}): Promise<boolean | null> {
  bind();
  if (!isSupabaseConfigured || !userId || !id) return null;
  try {
    const sb = supabaseBrowser();
    const { data: existing } = await sb.from('likes').select('user_id').eq('target_type', type).eq('target_id', id).eq('user_id', userId).maybeSingle();
    if (existing) {
      await sb.from('likes').delete().eq('target_type', type).eq('target_id', id).eq('user_id', userId);
      return false;
    }
    await sb.from('likes').insert({ user_id: userId, target_type: type, target_id: id });
    if (opts.ownerId) notify(opts.ownerId, { type: 'like', entityType: type, entityId: id, entityName: opts.entityName });
    return true;
  } catch {
    return null;
  }
}

/* ── Comments ────────────────────────────────────────────────────────────── */
export interface Comment {
  id: string;
  userId: string;
  handle?: string;
  name?: string;
  avatarUrl?: string;
  body: string;
  createdAt: string;
}

export async function getComments(type: TargetType, id: string): Promise<Comment[]> {
  if (!isSupabaseConfigured || !id) return [];
  try {
    const sb = supabaseBrowser();
    const { data } = await sb
      .from('comments')
      .select('id, user_id, body, created_at, profiles!comments_user_id_fkey(handle, display_name, avatar_url)')
      .eq('target_type', type).eq('target_id', id)
      .order('created_at', { ascending: true });
    return ((data ?? []) as SbRow[]).map((r: Record<string, unknown>) => {
      const p = r.profiles as { handle: string; display_name: string; avatar_url: string | null } | null;
      return {
        id: r.id as string, userId: r.user_id as string, body: r.body as string, createdAt: r.created_at as string,
        handle: p?.handle, name: p?.display_name ?? 'Member', avatarUrl: p?.avatar_url ?? undefined,
      };
    });
  } catch {
    return [];
  }
}

export async function commentCount(type: TargetType, id: string): Promise<number> {
  if (!isSupabaseConfigured || !id) return 0;
  try {
    const { count } = await supabaseBrowser().from('comments').select('*', { count: 'exact', head: true }).eq('target_type', type).eq('target_id', id);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function addComment(type: TargetType, id: string, body: string, opts: { ownerId?: string; entityName?: string } = {}): Promise<Comment | null> {
  bind();
  if (!isSupabaseConfigured || !userId || !body.trim()) return null;
  try {
    const { data, error } = await supabaseBrowser()
      .from('comments')
      .insert({ user_id: userId, target_type: type, target_id: id, body: body.trim() })
      .select('id, user_id, body, created_at, profiles!comments_user_id_fkey(handle, display_name, avatar_url)')
      .single();
    if (error || !data) return null;
    const p = (data as Record<string, unknown>).profiles as { handle: string; display_name: string; avatar_url: string | null } | null;
    if (opts.ownerId) notify(opts.ownerId, { type: 'comment', entityType: type, entityId: id, entityName: opts.entityName });
    return {
      id: data.id, userId: data.user_id, body: data.body, createdAt: data.created_at,
      handle: p?.handle, name: p?.display_name ?? 'Member', avatarUrl: p?.avatar_url ?? undefined,
    };
  } catch {
    return null;
  }
}
