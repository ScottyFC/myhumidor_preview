'use client';

/**
 * Super-admin access.
 *
 * Phase 6: when Supabase is configured, the source of truth is the current
 * user's `profiles.role` ('admin' | 'super_admin'), fetched on auth. The
 * bootstrap allowlist and a local demo toggle remain as fallbacks so the admin
 * area is reachable offline / before a role is set.
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';

const BOOTSTRAP_ADMINS = ['USER-cd2c8383eb384b379fda954b90e99b49'];

const KEY = 'myhumidor:admins';
const EVENT = 'myhumidor:admins-change';

let started = false;
let currentPublicId: string | null = null;
let currentUserId: string | null = null;
let currentRoleIsAdmin = false;

function fire() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}
function readPromoted(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

async function fetchRole() {
  if (!currentUserId) {
    currentRoleIsAdmin = false;
    fire();
    return;
  }
  try {
    const { data } = await supabaseBrowser().from('profiles').select('role').eq('id', currentUserId).single();
    currentRoleIsAdmin = data?.role === 'admin' || data?.role === 'super_admin';
    fire();
  } catch {
    /* ignore */
  }
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  subscribeAuth((s) => {
    currentPublicId = s?.publicId ?? null;
    currentUserId = s?.uuid ?? null;
    if (isSupabaseConfigured) fetchRole();
    else fire();
  });
}

export function listAdmins(): string[] {
  return Array.from(new Set([...BOOTSTRAP_ADMINS, ...readPromoted()]));
}

export function isAdmin(publicId?: string | null): boolean {
  start();
  if (!publicId) return false;
  if (BOOTSTRAP_ADMINS.includes(publicId) || readPromoted().includes(publicId)) return true;
  // Live DB role for the signed-in user.
  if (publicId === currentPublicId && currentRoleIsAdmin) return true;
  return false;
}

export function isBootstrapAdmin(publicId: string): boolean {
  return BOOTSTRAP_ADMINS.includes(publicId);
}

/** Promote an account to super admin. Writes profiles.role in Supabase mode. */
export function promoteAdmin(publicId: string) {
  start();
  const id = publicId.trim();
  if (!id) return;
  // local mirror (demo + immediate UI)
  try {
    if (!readPromoted().includes(id) && !BOOTSTRAP_ADMINS.includes(id)) {
      localStorage.setItem(KEY, JSON.stringify([...readPromoted(), id]));
    }
  } catch {
    /* ignore */
  }
  if (isSupabaseConfigured) {
    supabaseBrowser()
      .from('profiles')
      .update({ role: 'super_admin' })
      .eq('public_id', id)
      .then(({ error }) => error && console.error('[admin] promote failed:', error.message));
  }
  fire();
}

export function revokeAdmin(publicId: string) {
  start();
  if (BOOTSTRAP_ADMINS.includes(publicId)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(readPromoted().filter((id) => id !== publicId)));
  } catch {
    /* ignore */
  }
  if (isSupabaseConfigured) {
    supabaseBrowser()
      .from('profiles')
      .update({ role: 'consumer' })
      .eq('public_id', publicId)
      .then(({ error }) => error && console.error('[admin] revoke failed:', error.message));
  }
  fire();
}

export function onAdminsChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  start();
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
