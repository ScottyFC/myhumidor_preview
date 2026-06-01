'use client';

/**
 * Who the signed-in user follows. Persisted locally for the demo; in production
 * a `follows` table (follower_id, followee_id) drives this and the home feed.
 */

const KEY = 'myhumidor:following';
const EVENT = 'myhumidor:following-change';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function write(handles: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(handles));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function getFollowing(): string[] {
  return read();
}

export function isFollowing(handle: string): boolean {
  return read().includes(handle);
}

export function toggleFollow(handle: string): boolean {
  const list = read();
  if (list.includes(handle)) {
    write(list.filter((h) => h !== handle));
    return false;
  }
  write([handle, ...list]);
  return true;
}

export function onFollowingChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
