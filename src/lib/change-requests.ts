'use client';

/**
 * Crowd-sourced corrections to cigar/lounge data → `change_requests`, reviewed
 * in the admin portal. Dual-mode (localStorage fallback). Synchronous public
 * API via an in-memory cache, kept in sync across admins with realtime.
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';
import { subscribeTable } from './realtime';
import { logEvent } from './audit';

export interface ChangeRequest {
  id: string;
  targetType: 'cigar' | 'lounge';
  targetId: string;
  targetName: string;
  message: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  reviewedBy?: string | null;
  reviewerName?: string;
}

const KEY = 'myhumidor:change-requests';
const EVENT = 'myhumidor:change-requests-change';

let cache: ChangeRequest[] = [];
let started = false;
let userId: string | null = null;

function fire() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}
function loadLocal(): ChangeRequest[] {
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
  id: string; target_type: 'cigar' | 'lounge'; target_id: string; target_name: string;
  message: string; status: 'open' | 'resolved' | 'dismissed'; created_at: string | null;
  reviewed_by: string | null;
};
function rowTo(r: Row): ChangeRequest {
  return {
    id: r.id, targetType: r.target_type, targetId: r.target_id, targetName: r.target_name,
    message: r.message, status: r.status, createdAt: r.created_at ?? new Date().toISOString(),
    reviewedBy: r.reviewed_by,
  };
}
const SELECT = 'id, target_type, target_id, target_name, message, status, created_at, reviewed_by';

async function hydrateRemote() {
  try {
    const sb = supabaseBrowser();
    const { data, error } = await sb.from('change_requests').select(SELECT).order('created_at', { ascending: false });
    if (error) {
      console.error('[change-req] load failed:', error.message);
      return;
    }
    const rows = ((data ?? []) as Row[]).map((r) => rowTo(r));
    const ids = Array.from(new Set(rows.map((r) => r.reviewedBy).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await sb.from('profiles').select('id, handle, display_name').in('id', ids);
      const who = new Map<string, string>(
        ((profs ?? []) as Array<{ id: string; handle: string; display_name: string }>)
          .map((p) => [p.id, p.display_name || p.handle] as [string, string])
      );
      rows.forEach((r) => {
        if (r.reviewedBy) r.reviewerName = who.get(r.reviewedBy) ?? undefined;
      });
    }
    cache = rows;
    fire();
  } catch (e) {
    console.error('[change-req] load error:', e);
  }
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (isSupabaseConfigured) {
    subscribeAuth((s) => {
      userId = s?.uuid ?? null;
      hydrateRemote();
    });
    subscribeTable('change_requests', () => hydrateRemote());
  } else {
    cache = loadLocal();
  }
}

export function addChangeRequest(cr: Omit<ChangeRequest, 'id' | 'createdAt' | 'status'>): ChangeRequest {
  start();
  const rec: ChangeRequest = { ...cr, id: `cr_${Date.now()}`, status: 'open', createdAt: new Date().toISOString() };
  cache = [rec, ...cache];
  fire();
  if (isSupabaseConfigured) {
    supabaseBrowser()
      .from('change_requests')
      .insert({
        submitted_by: userId,
        target_type: cr.targetType,
        target_id: cr.targetId,
        target_name: cr.targetName,
        message: cr.message,
      })
      .then((r: { error: { message: string } | null }) => { if (r.error) { console.error('[change-req] insert failed:', r.error.message) } });
  } else {
    saveLocal();
  }
  return rec;
}

export function getChangeRequests(): ChangeRequest[] {
  start();
  if (!isSupabaseConfigured && cache.length === 0) cache = loadLocal();
  return [...cache].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function setChangeRequestStatus(id: string, status: 'resolved' | 'dismissed' | 'open') {
  start();
  const cr = cache.find((c) => c.id === id);
  cache = cache.map((c) => (c.id === id ? { ...c, status } : c));
  fire();
  if (isSupabaseConfigured) {
    supabaseBrowser()
      .from('change_requests')
      .update({ status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .then((r: { error: { message: string } | null }) => {
        const error = r.error;
        if (error) console.error('[change-req] update failed:', error.message);
        else {
          if (cr && status !== 'open') {
            logEvent({
              action: status === 'resolved' ? 'change_request.resolved' : 'change_request.dismissed',
              entityType: cr.targetType,
              entityId: cr.targetId,
              entityName: cr.targetName,
            });
          }
          hydrateRemote();
        }
      });
  } else {
    saveLocal();
  }
}

export function onChangeRequestsChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  start();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
