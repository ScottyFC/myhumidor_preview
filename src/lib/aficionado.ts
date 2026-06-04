'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';

/** Subscribe to whether the current user is a MyHumidor Aficionado member. */
export function subscribeAficionado(cb: (isMember: boolean) => void): () => void {
  return subscribeAuth(async (s) => {
    if (!s || !isSupabaseConfigured) {
      cb(false);
      return;
    }
    try {
      const { data } = await supabaseBrowser().from('profiles').select('aficionado').eq('id', s.uuid).single();
      cb(!!data?.aficionado);
    } catch {
      cb(false);
    }
  });
}
