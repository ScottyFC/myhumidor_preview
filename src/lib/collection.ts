'use client';

/**
 * The user's personal collection — cigars they've added to their humidor or
 * wishlist. Persisted in localStorage for the demo; in production these are rows
 * in `humidor_entries` (status: aging/ready/smoked/wishlist) keyed to auth.uid().
 */

export type CollectionStatus = 'humidor' | 'wishlist';

export interface CollectionItem {
  cigarId: string;
  slug: string;
  brand: string;
  name: string;
  size: string;
  status: CollectionStatus;
  addedAt: string;
}

const KEY = 'myhumidor:collection';
const EVENT = 'myhumidor:collection-change';

function read(): CollectionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function write(items: CollectionItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function getCollection(): CollectionItem[] {
  return read();
}

export function getStatus(cigarId: string): CollectionStatus | null {
  return read().find((i) => i.cigarId === cigarId)?.status ?? null;
}

export type CollectionSeed = Omit<CollectionItem, 'status' | 'addedAt'>;

/** Set (or clear) a cigar's status. Passing the current status again removes it. */
export function toggleStatus(seed: CollectionSeed, status: CollectionStatus): CollectionStatus | null {
  const items = read();
  const existing = items.find((i) => i.cigarId === seed.cigarId);
  if (existing && existing.status === status) {
    write(items.filter((i) => i.cigarId !== seed.cigarId));
    return null;
  }
  const next = items.filter((i) => i.cigarId !== seed.cigarId);
  next.unshift({ ...seed, status, addedAt: new Date().toISOString() });
  write(next);
  return status;
}

export function remove(cigarId: string) {
  write(read().filter((i) => i.cigarId !== cigarId));
}

export function onCollectionChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
