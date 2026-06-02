'use client';

/**
 * User-submitted cigars awaiting review.
 *
 * Dual-mode: Supabase `cigar_submissions` when configured, localStorage
 * otherwise. RLS means a normal user's cache holds only their own submissions,
 * while an admin's cache holds the whole queue (the admin review policy). Public
 * API stays synchronous via an in-memory cache.
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';

export interface Submission {
  id: string;
  brand: string;
  name: string;
  country: string;
  size: string;
  price: number | null;
  photoDataUrl?: string; // demo: data URL. Supabase: Storage URL.
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const KEY = 'myhumidor:submissions';
const EVENT = 'myhumidor:submissions-change';

let cache: Submission[] = [];
let started = false;
let userId: string | null = null;

function fire() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}
function loadLocal(): Submission[] {
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

type Row = {
  id: string;
  brand: string;
  name: string;
  country: string | null;
  size: string | null;
  price: number | null;
  photo_url: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string | null;
};
function rowTo(r: Row): Submission {
  return {
    id: r.id,
    brand: r.brand,
    name: r.name,
    country: r.country ?? '',
    size: r.size ?? '',
    price: r.price,
    photoDataUrl: r.photo_url ?? undefined,
    notes: r.notes ?? undefined,
    status: r.status,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}
const SELECT = 'id, brand, name, country, size, price, photo_url, notes, status, created_at';

async function hydrateRemote() {
  try {
    const { data, error } = await supabaseBrowser()
      .from('cigar_submissions')
      .select(SELECT)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[submissions] load failed:', error.message);
      return;
    }
    cache = (data ?? []).map((r) => rowTo(r as Row));
    fire();
  } catch (e) {
    console.error('[submissions] load error:', e);
  }
}

/** Best-effort photo upload to the `submissions` bucket; returns null on failure. */
async function uploadPhoto(dataUrl: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const sb = supabaseBrowser();
    const { error } = await sb.storage.from('submissions').upload(path, blob, { contentType: blob.type });
    if (error) {
      console.warn('[submissions] photo upload skipped:', error.message);
      return null;
    }
    return sb.storage.from('submissions').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
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

export function getSubmissions(): Submission[] {
  start();
  if (!isSupabaseConfigured && cache.length === 0) cache = loadLocal();
  return [...cache].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addSubmission(s: Omit<Submission, 'id' | 'status' | 'createdAt'>): Submission {
  start();
  const sub: Submission = {
    ...s,
    id: `sub_${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  // optimistic
  cache = [sub, ...cache];
  fire();

  if (isSupabaseConfigured && userId) {
    (async () => {
      let photo_url: string | null = null;
      if (s.photoDataUrl?.startsWith('data:')) photo_url = await uploadPhoto(s.photoDataUrl);
      const { data, error } = await supabaseBrowser()
        .from('cigar_submissions')
        .insert({
          submitted_by: userId,
          brand: s.brand,
          name: s.name,
          country: s.country || null,
          size: s.size || null,
          price: s.price,
          photo_url,
          notes: s.notes ?? null,
        })
        .select(SELECT)
        .single();
      if (error) {
        console.error('[submissions] insert failed:', error.message);
      } else if (data) {
        // swap the optimistic row for the real one (real id)
        cache = [rowTo(data as Row), ...cache.filter((x) => x.id !== sub.id)];
        fire();
      }
    })();
  } else {
    saveLocal();
  }
  return sub;
}

export function setSubmissionStatus(id: string, status: 'approved' | 'rejected') {
  start();
  cache = cache.map((s) => (s.id === id ? { ...s, status } : s));
  fire();
  if (isSupabaseConfigured) {
    supabaseBrowser()
      .from('cigar_submissions')
      .update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .then(({ error }) => error && console.error('[submissions] review failed:', error.message));
  } else {
    saveLocal();
  }
}

export function onSubmissionsChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  start();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
