'use client';

/**
 * Editable profile fields layered on top of the auth session.
 *
 * Dual-mode: when Supabase is configured these read/write columns on
 * `public.profiles` (display_name, city, state, bio, avatar_url) with avatars in
 * the `avatars` Storage bucket; otherwise they fall back to localStorage for the
 * offline demo. The public API stays synchronous via an in-memory cache.
 */

import { getSession, subscribeAuth } from './auth';
import { isSupabaseConfigured, supabaseBrowser } from './supabase';

export interface ProfileFields {
  handle: string;
  displayName: string;
  city: string;
  state: string;
  bio: string;
  avatarDataUrl?: string; // demo: data URL. Supabase: Storage public URL.
  aficionado?: boolean;
}

const KEY = 'myhumidor:profile';
const EVENT = 'myhumidor:profile-change';

let cache: ProfileFields | null = null;
let started = false;
let userId: string | null = null;

export function handleFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'member';
}

function fire() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

/* ── localStorage (demo) ─────────────────────────────────────────────────── */
function readOverrides(): Partial<ProfileFields> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Identity defaults derived from the current auth session. */
function fromSession(): ProfileFields {
  const s = getSession();
  const displayName = s?.displayName ?? 'Member';
  return {
    handle: handleFromName(displayName),
    displayName,
    city: s?.city ?? '',
    state: s?.state ?? '',
    bio: '',
    avatarDataUrl: undefined,
  };
}

/* ── Supabase ────────────────────────────────────────────────────────────── */
async function hydrateRemote() {
  if (!userId) return;
  try {
    const { data, error } = await supabaseBrowser()
      .from('profiles')
      .select('handle, display_name, city, state, bio, avatar_url, aficionado')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('[profile] load failed:', error.message);
      return;
    }
    if (data) {
      cache = {
        handle: data.handle ?? handleFromName(data.display_name ?? 'member'),
        displayName: data.display_name ?? 'Member',
        city: data.city ?? '',
        state: data.state ?? '',
        bio: data.bio ?? '',
        avatarDataUrl: data.avatar_url ?? undefined,
        aficionado: data.aficionado ?? false,
      };
      fire();
    }
  } catch (e) {
    console.error('[profile] load error:', e);
  }
}

/** Upload a data-URL avatar to Storage and return its public URL. */
async function uploadAvatar(dataUrl: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const ext = blob.type.split('/')[1] || 'png';
    const path = `${userId}/avatar.${ext}`;
    const sb = supabaseBrowser();
    const { error } = await sb.storage.from('avatars').upload(path, blob, {
      upsert: true,
      contentType: blob.type,
    });
    if (error) {
      console.error('[profile] avatar upload failed:', error.message);
      return null;
    }
    return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error('[profile] avatar error:', e);
    return null;
  }
}

async function persistRemote(fields: Partial<ProfileFields>) {
  if (!userId) return;
  const patch: Record<string, unknown> = {};
  if (fields.displayName !== undefined) patch.display_name = fields.displayName;
  if (fields.handle !== undefined) patch.handle = fields.handle;
  if (fields.city !== undefined) patch.city = fields.city;
  if (fields.state !== undefined) patch.state = fields.state;
  if (fields.bio !== undefined) patch.bio = fields.bio;

  // Avatar: if a data URL came in, upload it and store the resulting public URL.
  if (fields.avatarDataUrl !== undefined) {
    if (fields.avatarDataUrl.startsWith('data:')) {
      const url = await uploadAvatar(fields.avatarDataUrl);
      if (url) {
        patch.avatar_url = url;
        if (cache) cache.avatarDataUrl = url; // replace data URL with hosted URL
      }
    } else {
      patch.avatar_url = fields.avatarDataUrl;
    }
  }

  if (Object.keys(patch).length === 0) return;
  const { error } = await supabaseBrowser().from('profiles').update(patch).eq('id', userId);
  if (error) console.error('[profile] save failed:', error.message);
}

/* ── init (lazy, once) ───────────────────────────────────────────────────── */
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (isSupabaseConfigured) {
    subscribeAuth((s) => {
      userId = s?.uuid ?? null;
      if (userId) {
        cache = fromSession(); // optimistic until the row loads
        hydrateRemote();
      } else {
        cache = null;
        fire();
      }
    });
  }
}

/* ── public API (unchanged signatures) ───────────────────────────────────── */
export function getProfile(): ProfileFields {
  start();
  if (isSupabaseConfigured) {
    return cache ?? fromSession();
  }
  // demo: merge session identity with saved overrides
  const s = getSession();
  const o = readOverrides();
  const displayName = o.displayName ?? s?.displayName ?? 'Member';
  return {
    handle: o.handle ?? handleFromName(displayName),
    displayName,
    city: o.city ?? s?.city ?? '',
    state: o.state ?? s?.state ?? '',
    bio: o.bio ?? '',
    avatarDataUrl: o.avatarDataUrl,
  };
}

export function saveProfile(fields: Partial<ProfileFields>) {
  start();
  if (isSupabaseConfigured) {
    cache = { ...(cache ?? fromSession()), ...fields }; // optimistic
    fire();
    void persistRemote(fields);
    return;
  }
  try {
    const merged = { ...readOverrides(), ...fields };
    localStorage.setItem(KEY, JSON.stringify(merged));
    fire();
  } catch {
    /* ignore */
  }
}

export function onProfileChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  start();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

/** Look up any member's public profile by handle (for /u/[handle]). Supabase only. */
export async function fetchProfileByHandle(
  handle: string
): Promise<{ userId: string; publicId: string; type: 'consumer' | 'retailer'; profile: ProfileFields } | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabaseBrowser()
      .from('profiles')
      .select('id, public_id, account_type, handle, display_name, city, state, bio, avatar_url, aficionado')
      .eq('handle', handle)
      .single();
    if (error || !data) return null;
    return {
      userId: data.id,
      publicId: data.public_id,
      type: (data.account_type === 'consumer' ? 'consumer' : 'retailer'),
      profile: {
        handle: data.handle ?? handle,
        displayName: data.display_name ?? 'Member',
        city: data.city ?? '',
        state: data.state ?? '',
        bio: data.bio ?? '',
        avatarDataUrl: data.avatar_url ?? undefined,
        aficionado: data.aficionado ?? false,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Make sure the signed-in user has a public.profiles row. New accounts get one
 * from the handle_new_user trigger, but if that ever failed to fire (e.g. an
 * account created before the account_type constraint allowed 'retailer'), this
 * self-heals client-side so submissions don't hit a foreign-key error on
 * lounge_submissions.submitted_by. Requires the "users insert own profile"
 * policy (phase26).
 */
export async function ensureProfile(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    const user = u.user;
    if (!user) return false;

    const { data: existing } = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (existing) return true;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const at =
      meta.account_type === 'retailer' || meta.account_type === 'lounge' ? 'retailer' : 'consumer';
    const base = (user.email?.split('@')[0] || 'member').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'member';
    const display =
      (meta.display_name as string) || (meta.lounge_name as string) || base || 'You';

    const { error } = await sb.from('profiles').upsert(
      {
        id: user.id,
        public_id: 'USER-' + user.id.replace(/-/g, ''),
        handle: `${base}${Math.floor(1000 + Math.random() * 9000)}`,
        display_name: display,
        role: 'consumer',
        account_type: at,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.error('[ensureProfile] failed:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[ensureProfile] error:', e);
    return false;
  }
}
