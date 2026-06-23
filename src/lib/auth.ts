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
  type: AccountType;       // active mode (may be switched)
  baseType: AccountType;   // the account's real type
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
  ownsMultiple?: boolean;
}

const KEY = 'myhumidor:session';
const EVENT = 'myhumidor:auth-change';

const MODE_KEY = 'myhumidor:mode';

/** The user's chosen active mode, if they've switched (retailer-capable only). */
export function getAccountMode(): AccountType | null {
  if (typeof window === 'undefined') return null;
  const m = localStorage.getItem(MODE_KEY);
  return m === 'retailer' || m === 'consumer' ? m : null;
}

/** Switch the active account mode (Aficionado ↔ Retailer) and re-notify. */
export function setAccountMode(mode: AccountType | null) {
  try {
    if (mode) localStorage.setItem(MODE_KEY, mode); else localStorage.removeItem(MODE_KEY);
  } catch { /* ignore */ }
  if (isSupabaseConfigured && currentSession) {
    const active = mode ?? currentSession.baseType;
    currentSession = { ...currentSession, type: active, publicId: publicIdFromUuid(currentSession.uuid, active) };
    authListeners.forEach((cb) => { try { cb(currentSession); } catch { /* ignore */ } });
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

/** Whether the user may act as a retailer (owns a lounge or signed up as one). */
export async function canRetail(uuid: string, baseType: AccountType): Promise<boolean> {
  if (baseType === 'retailer') return true;
  if (!isSupabaseConfigured) return false;
  try {
    const { data } = await supabaseBrowser().from('lounges').select('id').eq('owner_id', uuid).limit(1);
    return (data ?? []).length > 0;
  } catch { return false; }
}


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
    baseType: input.type,
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
  const baseType: AccountType = (meta.account_type === 'retailer' || meta.account_type === 'lounge') ? 'retailer' : 'consumer';
  const type: AccountType = baseType;
  return {
    uuid: user.id,
    publicId: publicIdFromUuid(user.id, type),
    type,
    baseType,
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
  enforceEphemeralSession();
  const sb = supabaseBrowser();
  // onAuthStateChange fires INITIAL_SESSION right after registration (reading
  // from storage), so this resolves the initial state without a getSession call.
  sb.auth.onAuthStateChange((_e: string, sess: { user: unknown } | null) => {
    currentSession = sess ? sessionFromUser(sess.user) : null;
    authResolved = true;
    authListeners.forEach((cb) => { try { cb(currentSession); } catch { /* ignore */ } });
    // Sync deletions: if the auth user still exists but its profile row was
    // removed in Supabase, treat the account as deleted and sign out.
    if (currentSession) verifyProfileExists(currentSession.uuid);
  });
}

let lastVerified: string | null = null;
async function verifyProfileExists(uuid: string) {
  if (lastVerified === uuid) return;
  lastVerified = uuid;
  try {
    const { data, error } = await supabaseBrowser().from('profiles').select('id').eq('id', uuid).maybeSingle();
    if (!error && !data) {
      // Profile gone → account removed. Drop the session everywhere.
      await supabaseBrowser().auth.signOut();
      currentSession = null;
      authListeners.forEach((cb) => { try { cb(null); } catch { /* ignore */ } });
    }
  } catch { /* network blip — leave session as-is */ }
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
  userId?: string;
}

export async function signUpEmail(input: SignUpInput): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    demoSet(demoSession({ ...input, provider: 'password' }));
    return {};
  }
  const sb = supabaseBrowser();
  // Handle = display name with spaces/punctuation stripped. Reject if taken so
  // two members can't share a username (the DB unique constraint is the backstop).
  const handle = (input.displayName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (handle) {
    try {
      const { data: available } = await sb.rpc('handle_available', { p_handle: handle });
      if (available === false) {
        return { error: `The username “${handle}” is taken. Try a different display name.` };
      }
    } catch { /* if the check fails, fall through; the unique constraint still guards */ }
  }
  const { data, error } = await sb.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?type=${input.type}`,
      data: {
        account_type: input.type,
        display_name: input.displayName,
        handle,
        owns_multiple: input.ownsMultiple ?? false,
        lounge_name: input.loungeName,
        city: input.city,
        state: input.state,
      },
    },
  });
  if (error) return { error: error.message };
  // Supabase returns a "fake" success for an already-registered email (to avoid
  // user enumeration): a user object with an empty identities array and no
  // session. Treat that as a clear, friendly error instead of pretending to
  // create a duplicate account.
  const identities = data.user?.identities;
  if (data.user && Array.isArray(identities) && identities.length === 0) {
    return { error: 'An account with this email already exists. Please sign in instead.' };
  }
  // If email confirmation is on, there's no session yet.
  return { needsConfirmation: !data.session, userId: data.user?.id };
}

export async function signInEmail(email: string, password: string, remember = true): Promise<AuthResult> {
  setRememberPreference(remember);
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

const EPHEMERAL_KEY = 'mh:ephemeral';
const ALIVE_KEY = 'mh:session-alive';

/** Records whether the session should survive the browser closing. */
function setRememberPreference(remember: boolean) {
  try {
    if (remember) localStorage.removeItem(EPHEMERAL_KEY);
    else localStorage.setItem(EPHEMERAL_KEY, '1');
    sessionStorage.setItem(ALIVE_KEY, '1');
  } catch { /* ignore */ }
}

/** If the user opted out of "Remember me", drop the session when the browser is
 *  reopened (no sessionStorage marker = a fresh browser session). */
function enforceEphemeralSession() {
  try {
    const ephemeral = localStorage.getItem(EPHEMERAL_KEY) === '1';
    const aliveThisSession = sessionStorage.getItem(ALIVE_KEY) === '1';
    if (ephemeral && !aliveThisSession) {
      supabaseBrowser().auth.signOut();
    }
    sessionStorage.setItem(ALIVE_KEY, '1');
  } catch { /* ignore */ }
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
  try { localStorage.removeItem(MODE_KEY); } catch { /* ignore */ }
  lastVerified = null;
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

// ── Password reset (Supabase users: consumers + lounge/retailers) ───────────
/** Send a Supabase password-recovery email. Always returns ok to avoid revealing
 *  whether an account exists. */
export async function requestPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not configured' };
  const sb = supabaseBrowser();
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
  await sb.auth.resetPasswordForEmail(email, { redirectTo });
  return { ok: true };
}

/** Set a new password for the current (recovery) session — used on /reset-password
 *  after following the email link. */
export async function updatePassword(password: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not configured' };
  const sb = supabaseBrowser();
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
