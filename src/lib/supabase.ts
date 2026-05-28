/**
 * Supabase clients. Used in two contexts:
 *
 *   1. Browser components — calls supabaseBrowser() to get an anon client
 *      tied to the user's session.
 *   2. Server components / Route handlers — calls supabaseServer() which uses
 *      cookies for SSR auth.
 *
 * Wire these up after creating a Supabase project and running supabase/schema.sql.
 */

import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function supabaseBrowser() {
  return createBrowserClient(URL, ANON_KEY);
}

export async function supabaseServer() {
  const { cookies } = await import('next/headers');
  const cookieStore = cookies();
  return createServerClient(URL, ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // server component context — read only, ignore
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // ignore
        }
      },
    },
  });
}

export const isSupabaseConfigured = !!URL && !!ANON_KEY;
