'use client';

/**
 * Who the signed-in user follows.
 *
 * Dual-mode: Supabase `follows` (follower_id/followee_id) when configured,
 * localStorage otherwise. The UI works in handles; on write we resolve the
 * handle to a user id. Public API stays synchronous via an in-memory cache.
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';

const KEY = 'myhumidor:following';
const EVENT = 'myhumidor:following-change';

let cache: string[] = []; // handles
let started = false;
let userId: string | null = null;

function fire() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}
function loadLocal(): string[] {
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

async function hydrateRemote() {
  if (!userId) return;
  try {
    const sb = supabaseBrowser();
    const { data: rows, error } = await sb.from('follows').select('followee_id').eq('follower_id', userId);
    if (error) {
      console.error('[follows] load failed:', error.message);
      return;
    }
    const ids = (rows ?? []).map((r) => r.followee_id);
    if (ids.length === 0) {
      cache = [];
      fire();
      return;
    }
    const { data: profs } = await sb.from('profiles').select('handle').in('id', ids);
    cache = (profs ?? []).map((p) => p.handle).filter(Boolean);
    fire();
  } catch (e) {
    console.error('[follows] load error:', e);
  }
}

async function resolveId(handle: string): Promise<string | null> {
  try {
    const { data } = await supabaseBrowser().from('profiles').select('id').eq('handle', handle).single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

async function persistFollow(handle: string, following: boolean) {
  if (!isSupabaseConfigured) return saveLocal();
  if (!userId) return;
  const followeeId = await resolveId(handle);
  if (!followeeId) return;
  const sb = supabaseBrowser();
  if (following) {
    const { error } = await sb.from('follows').upsert(
      { follower_id: userId, followee_id: followeeId },
      { onConflict: 'follower_id,followee_id' }
    );
    if (error) console.error('[follows] follow failed:', error.message);
  } else {
    const { error } = await sb.from('follows').delete().eq('follower_id', userId).eq('followee_id', followeeId);
    if (error) console.error('[follows] unfollow failed:', error.message);
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
  } else {
    cache = loadLocal();
  }
}

export function getFollowing(): string[] {
  start();
  if (!isSupabaseConfigured && cache.length === 0) cache = loadLocal();
  return [...cache];
}

export function isFollowing(handle: string): boolean {
  start();
  return cache.includes(handle);
}

export function toggleFollow(handle: string): boolean {
  start();
  const now = !cache.includes(handle);
  cache = now ? [handle, ...cache] : cache.filter((h) => h !== handle);
  fire();
  void persistFollow(handle, now);
  return now;
}

export function onFollowingChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  start();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/* ── Reading another user's followers / following (by user id) ───────────── */
export interface FollowPerson {
  handle: string;
  displayName: string;
  avatarUrl?: string;
}

export async function fetchFollowStats(targetUserId: string): Promise<{ followers: number; following: number }> {
  if (!isSupabaseConfigured || !targetUserId) return { followers: 0, following: 0 };
  try {
    const sb = supabaseBrowser();
    const [{ count: followers }, { count: following }] = await Promise.all([
      sb.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', targetUserId),
      sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId),
    ]);
    return { followers: followers ?? 0, following: following ?? 0 };
  } catch {
    return { followers: 0, following: 0 };
  }
}

/** kind='followers' → people who follow target; 'following' → people target follows. */
export async function fetchFollowList(targetUserId: string, kind: 'followers' | 'following', limit = 50): Promise<FollowPerson[]> {
  if (!isSupabaseConfigured || !targetUserId) return [];
  try {
    const sb = supabaseBrowser();
    const col = kind === 'followers' ? 'followee_id' : 'follower_id';
    const pick = kind === 'followers' ? 'follower_id' : 'followee_id';
    const { data: rows } = await sb.from('follows').select(pick).eq(col, targetUserId).limit(limit);
    const ids = (rows ?? []).map((r) => (r as Record<string, string>)[pick]).filter(Boolean);
    if (ids.length === 0) return [];
    const { data: profs } = await sb.from('profiles').select('handle, display_name, avatar_url').in('id', ids);
    return (profs ?? []).map((p) => ({
      handle: p.handle,
      displayName: p.display_name ?? 'Member',
      avatarUrl: p.avatar_url ?? undefined,
    }));
  } catch {
    return [];
  }
}
