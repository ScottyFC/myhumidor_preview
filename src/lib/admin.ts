'use client';

/**
 * Super-admin access. Bootstrapped with the founding admin; additional admins
 * can be promoted. In production this is `profiles.role = 'super_admin'`
 * (checked server-side via RLS); the localStorage layer here mirrors it for the
 * demo so the admin dashboard is usable offline.
 */

// Founding super admin (provided): USER-cd2c8383eb384b379fda954b90e99b49
const BOOTSTRAP_ADMINS = ['USER-cd2c8383eb384b379fda954b90e99b49'];

const KEY = 'myhumidor:admins';
const EVENT = 'myhumidor:admins-change';

function readPromoted(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function listAdmins(): string[] {
  return Array.from(new Set([...BOOTSTRAP_ADMINS, ...readPromoted()]));
}

export function isAdmin(publicId?: string | null): boolean {
  if (!publicId) return false;
  return listAdmins().includes(publicId);
}

export function isBootstrapAdmin(publicId: string): boolean {
  return BOOTSTRAP_ADMINS.includes(publicId);
}

/** Promote another account to super admin (demo: stored locally). */
export function promoteAdmin(publicId: string) {
  const id = publicId.trim();
  if (!id || isAdmin(id)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...readPromoted(), id]));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function revokeAdmin(publicId: string) {
  if (BOOTSTRAP_ADMINS.includes(publicId)) return; // can't revoke the founder
  try {
    localStorage.setItem(KEY, JSON.stringify(readPromoted().filter((id) => id !== publicId)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function onAdminsChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
