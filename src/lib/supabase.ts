/**
 * Supabase clients.
 *
 *   - supabaseBrowser()  — client components, tied to the user's session.
 *   - supabaseServer()   — server components / route handlers (cookie-based SSR auth).
 *
 * The key may be either the legacy anon key (eyJ…) or the newer publishable key
 * (sb_publishable_…). Both are client-safe and enforced by row-level security.
 *
 * `isSupabaseConfigured` is true only when BOTH the project URL and a key are
 * present. Until then the app runs in demo mode (localStorage) and auth/route
 * protection no-op, so everything still works without a backend.
 */

import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import { processLock } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  '';

export const isSupabaseConfigured =
  /^https:\/\/.+\.supabase\./.test(SUPABASE_URL) && !!SUPABASE_KEY;

/**
 * One browser client for the whole tab. Creating a new client per call (the old
 * behavior) spun up multiple GoTrueClient instances that all fought over the
 * same Web Locks entry — the cause of the humidor hanging on a token refresh
 * when a tab regained focus.
 *
 * We use `processLock` (in-memory, single-tab) instead of the default
 * `navigatorLock` (Web Locks API). processLock still serialises auth operations
 * within the tab — so a token refresh can't race sign-out or itself — but
 * without the cross-tab LockManager that was deadlocking. A fully pass-through
 * lock removed serialisation entirely, which let refreshes race sign-out (you
 * couldn't log out) and emit spurious SIGNED_OUT events (admin redirect loop).
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function supabaseBrowser() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: processLock,
    },
  });
  return browserClient;
}

export async function supabaseServer() {
  const { cookies } = await import('next/headers');
  const cookieStore = cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component — safe to ignore; middleware refreshes the session
        }
      },
    },
  });
}

/**
 * SERVER-ONLY service-role client. Reads the secret from SUPABASE_SERVICE_KEY,
 * which must be set as a server environment variable (e.g. in Vercel) and is
 * NEVER prefixed with NEXT_PUBLIC, so it is never shipped to the browser or the
 * TV app. Returns null if the key isn't configured, so callers can fall back to
 * the anon client. This bypasses row-level security — use only in route handlers
 * for trusted server work (e.g. serving ads, reconciliation jobs).
 */
export function supabaseService() {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey || !SUPABASE_URL) return null;
  // Plain client, no cookies/session — auth is the service role itself.
  return createServerClient<Database>(SUPABASE_URL, serviceKey, {
    cookies: { getAll() { return []; }, setAll() { /* no-op */ } },
  });
}
