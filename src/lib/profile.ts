'use client';

/**
 * Editable profile fields layered on top of the auth session. Persisted locally
 * for the demo; in production these are columns on `public.profiles`
 * (display_name, city, state, bio, avatar_url) with the avatar in Storage.
 */

import { getSession } from './auth';

export interface ProfileFields {
  handle: string;
  displayName: string;
  city: string;
  state: string;
  bio: string;
  avatarDataUrl?: string; // demo: data URL. Production: Storage public URL.
}

const KEY = 'myhumidor:profile';
const EVENT = 'myhumidor:profile-change';

export function handleFromName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 20) || 'member'
  );
}

function readOverrides(): Partial<ProfileFields> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Merge the session identity with any saved profile overrides. */
export function getProfile(): ProfileFields {
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
  try {
    const merged = { ...readOverrides(), ...fields };
    localStorage.setItem(KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function onProfileChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
