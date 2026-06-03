'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';

/** Re-run `cb` whenever rows in `table` change (insert/update/delete). */
export function subscribeTable(table: string, cb: () => void): () => void {
  if (!isSupabaseConfigured || typeof window === 'undefined') return () => {};
  try {
    const sb = supabaseBrowser();
    const ch = sb
      .channel(`rt_${table}_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => cb())
      .subscribe();
    return () => {
      try {
        sb.removeChannel(ch);
      } catch {
        /* ignore */
      }
    };
  } catch {
    return () => {};
  }
}
