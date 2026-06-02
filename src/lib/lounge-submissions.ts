'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';
import { geocodeAddress } from './geocode';

export interface LoungeSubmission {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const KEY = 'myhumidor:lounge-submissions';
const EVENT = 'myhumidor:lounge-submissions-change';

let cache: LoungeSubmission[] = [];
let started = false;
let userId: string | null = null;

function fire() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}
function loadLocal(): LoungeSubmission[] {
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
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'lounge';
}

type Row = {
  id: string; name: string; address: string | null; city: string | null; state: string | null;
  phone: string | null; email: string | null; website: string | null; notes: string | null;
  status: 'pending' | 'approved' | 'rejected'; created_at: string | null;
};
function rowTo(r: Row): LoungeSubmission {
  return {
    id: r.id, name: r.name, address: r.address ?? '', city: r.city ?? '', state: r.state ?? '',
    phone: r.phone ?? undefined, email: r.email ?? undefined, website: r.website ?? undefined,
    notes: r.notes ?? undefined, status: r.status, createdAt: r.created_at ?? new Date().toISOString(),
  };
}
const SELECT = 'id, name, address, city, state, phone, email, website, notes, status, created_at';

async function hydrateRemote() {
  try {
    const { data, error } = await supabaseBrowser()
      .from('lounge_submissions')
      .select(SELECT)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[lounge-sub] load failed:', error.message);
      return;
    }
    cache = (data ?? []).map((r) => rowTo(r as Row));
    fire();
  } catch (e) {
    console.error('[lounge-sub] load error:', e);
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

export function getLoungeSubmissions(): LoungeSubmission[] {
  start();
  if (!isSupabaseConfigured && cache.length === 0) cache = loadLocal();
  return [...cache].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function submitLounge(f: Omit<LoungeSubmission, 'id' | 'status' | 'createdAt'>): LoungeSubmission {
  start();
  const sub: LoungeSubmission = { ...f, id: `lsub_${Date.now()}`, status: 'pending', createdAt: new Date().toISOString() };
  cache = [sub, ...cache];
  fire();
  if (isSupabaseConfigured && userId) {
    (async () => {
      const { data, error } = await supabaseBrowser()
        .from('lounge_submissions')
        .insert({
          submitted_by: userId,
          name: f.name,
          address: f.address || null,
          city: f.city || null,
          state: f.state || null,
          phone: f.phone || null,
          email: f.email || null,
          website: f.website || null,
          notes: f.notes || null,
        })
        .select(SELECT)
        .single();
      if (error) console.error('[lounge-sub] insert failed:', error.message);
      else if (data) {
        cache = [rowTo(data as Row), ...cache.filter((x) => x.id !== sub.id)];
        fire();
      }
    })();
  } else {
    saveLocal();
  }
  return sub;
}

async function pushToLounges(sub: LoungeSubmission) {
  try {
    const slug = `${slugify(sub.name)}-${Math.random().toString(36).slice(2, 7)}`;
    // Geocode so the lounge shows on the map + in nearby results.
    const coords = await geocodeAddress({
      name: sub.name,
      address: sub.address,
      city: sub.city,
      state: sub.state,
    });
    const { error } = await supabaseBrowser().from('lounges').insert({
      slug,
      name: sub.name,
      address: sub.address || null,
      city: sub.city || '',
      state: sub.state || '',
      phone: sub.phone || null,
      email: sub.email || null,
      website: sub.website || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      verified: false,
      certified: false,
    });
    if (error) console.error('[lounge-sub] push to lounges failed:', error.message);
  } catch (e) {
    console.error('[lounge-sub] push error:', e);
  }
}

export function setLoungeSubmissionStatus(id: string, status: 'approved' | 'rejected') {
  start();
  const sub = cache.find((s) => s.id === id);
  cache = cache.map((s) => (s.id === id ? { ...s, status } : s));
  fire();
  if (isSupabaseConfigured) {
    supabaseBrowser()
      .from('lounge_submissions')
      .update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .then(({ error }) => error && console.error('[lounge-sub] review failed:', error.message));
    if (status === 'approved' && sub) void pushToLounges(sub);
  } else {
    saveLocal();
  }
}

export function onLoungeSubmissionsChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  start();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
