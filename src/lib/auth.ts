'use client';

/**
 * Auth layer with two modes:
 *   - REAL  (Supabase configured): real signup/login, OAuth, sessions.
 *   - DEMO  (no Supabase URL): localStorage session so the app still works.
 *
 * The same functions are used by the UI in both modes — flipping NEXT_PUBLIC_
 * SUPABASE_URL/KEY in the environment switches everything over with no code
 * changes. account_type is carried in user metadata at signup; the
 * handle_new_user trigger reads it to stamp the typed public_id (USER-/LNGE-).
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { type AccountType, publicIdFromUuid, generateAccountId } from './ids';

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

export interface SignUpInput {
  type: AccountType;
  email: string;
  password: string;
  displayName: string;
  loungeName?: string;
  city?: string;
  state?: string;
}

const KEY = 'myhumidor:session';
const EVENT = 'myhumidor:auth-change';

/* ─────────────────────────── DEMO (localStorage) ─────────────────────────── */

function demoGet(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function demoSet(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

function demoClear() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

function demoSession(input: {
  type: AccountType;
  email: string;
  displayName: string;
  provider: AuthProvider;
  loungeName?: string;
  city?: string;
  state?: string;
}): Session {
  const { uuid, publicId } = generateAccountId(input.type);
  return {
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
}

/* ─────────────────────────── REAL (Supabase) ─────────────────────────────── */

/* eslint-disable @typescript-eslint/no-explicit-any */
function sessionFromUser(user: any): Session {
  const meta = user.user_metadata ?? {};
  const type: AccountType = (meta.account_type === 'retailer' || meta.account_type === 'lounge') ? 'retailer' : 'consumer';
  return {
    uuid: user.id,
    publicId: publicIdFromUuid(user.id, type),
    type,
    email: user.email ?? '',
    displayName: meta.display_name || meta.name || (user.email?.split('@')[0] ?? 'You'),
    provider: (user.app_metadata?.provider as AuthProvider) ?? 'password',
    loungeName: meta.lounge_name,
    city: meta.city,
    state: meta.state,
    createdAt: user.created_at ?? new Date().toISOString(),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ─────────────────────────────── PUBLIC API ──────────────────────────────── */

/** Subscribe to the current session. Fires immediately, then on every change. */
/* ── Auth state: ONE client listener fans out to all subscribers ──────────────
 * Previously every component registered its own onAuthStateChange on the shared
 * client and also called getSession(), so a single client could carry a dozen
 * awaited callbacks per auth event and each page raced a getSession() promise
 * that could stall — pages hung on "checking". Now there's exactly one client
 * listener; subscribers join a Set and, once the initial session has resolved,
 * late subscribers get the current value synchronously (no getSession wait). */
let authListeners = new Set<(s: Session | null) => void>();
let currentSession: Session | null = null;
let authResolved = false;
let authWired = false;

function wireAuthListener() {
  if (authWired) return;
  authWired = true;
  const sb = supabaseBrowser();
  // onAuthStateChange fires INITIAL_SESSION right after registration (reading
  // from storage), so this resolves the initial state without a getSession call.
  sb.auth.onAuthStateChange((_e: string, sess: { user: unknown } | null) => {
    currentSession = sess ? sessionFromUser(sess.user) : null;
    authResolved = true;
    authListeners.forEach((cb) => { try { cb(currentSession); } catch { /* ignore */ } });
  });
}

export function subscribeAuth(cb: (s: Session | null) => void): () => void {
  if (!isSupabaseConfigured) {
    if (typeof window === 'undefined') return () => {};
    cb(demoGet());
    const handler = () => cb(demoGet());
    window.addEventListener(EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }
  wireAuthListener();
  authListeners.add(cb);
  // A subscriber that mounts after the initial resolution gets the current
  // state immediately; before resolution it waits for the single listener so it
  // never receives a premature null (which would bounce it to /register).
  if (authResolved) cb(currentSession);
  return () => { authListeners.delete(cb); };
}

export interface AuthResult {
  error?: string;
  needsConfirmation?: boolean;
}

export async function signUpEmail(input: SignUpInput): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    demoSet(demoSession({ ...input, provider: 'password' }));
    return {};
  }
  const sb = supabaseBrowser();
  const { data, error } = await sb.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?type=${input.type}`,
      data: {
        account_type: input.type,
        display_name: input.displayName,
        lounge_name: input.loungeName,
        city: input.city,
        state: input.state,
      },
    },
  });
  if (error) return { error: error.message };
  // If email confirmation is on, there's no session yet.
  return { needsConfirmation: !data.session };
}

export async function signInEmail(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    const existing = demoGet();
    demoSet(
      existing ?? demoSession({ type: 'consumer', email, displayName: email.split('@')[0], provider: 'password' })
    );
    return {};
  }
  const sb = supabaseBrowser();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return { error: error?.message };
}

export async function signInOAuth(provider: 'google' | 'apple', type: AccountType): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    demoSet(
      demoSession({
        type,
        provider,
        email: `you@${provider}.com`,
        displayName: type === 'retailer' ? 'Your Lounge' : 'You',
      })
    );
    return {};
  }
  const sb = supabaseBrowser();
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback?type=${type}` },
  });
  return { error: error?.message };
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    demoClear();
    return;
  }
  await supabaseBrowser().auth.signOut();
}

/** Re-send the signup confirmation email. */
export async function resendConfirmation(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    // Demo: no real email is sent.
    return {};
  }
  const sb = supabaseBrowser();
  const { error } = await sb.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  return { error: error?.message };
}

/** Demo-only synchronous read (used as a fast first paint where needed). */
export function getSession(): Session | null {
  return isSupabaseConfigured ? currentSession : demoGet();
}
