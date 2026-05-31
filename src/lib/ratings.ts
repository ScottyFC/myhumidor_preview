'use client';

/**
 * The signed-in user's cigar ratings. Persisted locally for the demo; in
 * production each is a row in the `ratings` table keyed to auth.uid() + cigar_id,
 * and a trigger maintains the per-cigar community averages.
 */

export interface UserRating {
  cigarId: string;
  slug: string;
  brand: string;
  name: string;
  size: string;
  flavor: number;
  burn: number;
  appearance: number;
  overall: number;
  notes?: string;
  tastingNotes?: string[];
  createdAt: string;
}

const KEY = 'myhumidor:ratings';
const EVENT = 'myhumidor:ratings-change';

function read(): UserRating[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function write(items: UserRating[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function getRatings(): UserRating[] {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getRating(cigarId: string): UserRating | null {
  return read().find((r) => r.cigarId === cigarId) ?? null;
}

export function setRating(rating: UserRating) {
  const next = read().filter((r) => r.cigarId !== rating.cigarId);
  next.unshift(rating);
  write(next);
}

export function onRatingsChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
