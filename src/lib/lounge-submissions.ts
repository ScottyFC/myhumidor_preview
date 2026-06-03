'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';
import { geocodeAddress } from './geocode';
import { subscribeTable } from './realtime';
import { logEvent } from './audit';

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
  reviewedBy?: string | null;
  reviewerName?: string;
  loungeId?: string | null;
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
  reviewed_by: string | null; lounge_id: string | null;
};
function rowTo(r: Row): LoungeSubmission {
  return {
    id: r.id, name: r.name, address: r.address ?? '', city: r.city ?? '', state: r.state ?? '',
    phone: r.phone ?? undefined, email: r.email ?? undefined, website: r.website ?? undefined,
    notes: r.notes ?? undefined, status: r.status, createdAt: r.created_at ?? new Date().toISOString(),
    reviewedBy: r.reviewed_by, loungeId: r.lounge_id,
  };
}
const SELECT = 'id, name, address, city, state, phone, email, website, notes, status, created_at, reviewed_by, lounge_id';

async function hydrateRemote() {
  try {
    const sb = supabaseBrowser();
    const { data, error } = await sb
      .from('lounge_submissions')
      .select(SELECT)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[lounge-sub] load failed:', error.message);
      return;
    }
    const rows = (data ?? []).map((r) => rowTo(r as Row));
    const ids = Array.from(new Set(rows.map((r) => r.reviewedBy).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await sb.from('profiles').select('id, handle, display_name').in('id', ids);
      const who = new Map((profs ?? []).map((p) => [p.id, p.display_name || p.handle]));
      rows.forEach((r) => {
        if (r.reviewedBy) r.reviewerName = who.get(r.reviewedBy) ?? undefined;
      });
    }
    cache = rows;
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
    subscribeTable('lounge_submissions', () => {
      if (userId) hydrateRemote();
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

async function pushToLounges(sub: LoungeSubmission): Promise<string | null> {
  try {
    const slug = `${slugify(sub.name)}-${Math.random().toString(36).slice(2, 7)}`;
    const coords = await geocodeAddress({
      name: sub.name,
      address: sub.address,
      city: sub.city,
      state: sub.state,
    });
    const { data, error } = await supabaseBrowser()
      .from('lounges')
      .insert({
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
      })
      .select('id')
      .single();
    if (error) {
      console.error('[lounge-sub] push to lounges failed:', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e) {
    console.error('[lounge-sub] push error:', e);
    return null;
  }
}

export function setLoungeSubmissionStatus(id: string, status: 'approved' | 'rejected') {
  start();
  const sub = cache.find((s) => s.id === id);
  cache = cache.map((s) => (s.id === id ? { ...s, status } : s));
  fire();
  if (isSupabaseConfigured) {
    (async () => {
      const sb = supabaseBrowser();
      let loungeId = sub?.loungeId ?? null;
      if (status === 'approved' && sub && !loungeId) {
        loungeId = await pushToLounges(sub);
      }
      const { error } = await sb
        .from('lounge_submissions')
        .update({
          status,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          ...(loungeId ? { lounge_id: loungeId } : {}),
        })
        .eq('id', id);
      if (error) console.error('[lounge-sub] review failed:', error.message);
      else if (sub) {
        logEvent({
          action: status === 'approved' ? 'lounge.approved' : 'lounge.rejected',
          entityType: 'lounge',
          entityId: loungeId ?? sub.id,
          entityName: sub.name,
          loungeId: loungeId,
        });
      }
      hydrateRemote();
    })();
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
