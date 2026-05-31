'use client';

/**
 * Demo authentication layer. Stores a session in localStorage so the app behaves
 * like a logged-in experience without a backend.
 *
 * PRODUCTION: replace every function here with Supabase Auth:
 *   - manual:  supabase.auth.signUp({ email, password, options:{ data:{ account_type } }})
 *   - google:  supabase.auth.signInWithOAuth({ provider:'google' })
 *   - apple:   supabase.auth.signInWithOAuth({ provider:'apple' })
 *   - session: supabase.auth.getSession() / onAuthStateChange()
 * Supabase assigns auth.users.id (the real UUID); a DB trigger creates the
 * profile row and derives the typed public_id (see supabase/schema.sql).
 *
 * We never store passwords ourselves — Supabase Auth handles hashing, OAuth,
 * sessions, and password resets.
 */

import { type AccountType, generateAccountId } from './ids';

export type AuthProvider = 'password' | 'google' | 'apple';

export interface Session {
  uuid: string;
  publicId: string;
  type: AccountType;
  email: string;
  displayName: string;
  provider: AuthProvider;
  loungeName?: string;
  city?: string;
  state?: string;
  createdAt: string;
}

const KEY = 'myhumidor:session';
const EVENT = 'myhumidor:auth-change';

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function persist(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function onAuthChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

interface RegisterInput {
  type: AccountType;
  email: string;
  displayName: string;
  provider: AuthProvider;
  loungeName?: string;
  city?: string;
  state?: string;
}

/** Create a session (sign up or OAuth first-time). Generates the typed ID. */
export function createSession(input: RegisterInput): Session {
  const { uuid, publicId } = generateAccountId(input.type);
  const session: Session = {
    uuid,
    publicId,
    type: input.type,
    email: input.email,
    displayName: input.displayName,
    provider: input.provider,
    loungeName: input.loungeName,
    city: input.city,
    state: input.state,
    createdAt: new Date().toISOString(),
  };
  persist(session);
  return session;
}
