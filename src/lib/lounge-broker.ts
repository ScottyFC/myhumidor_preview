import 'server-only';
import { supabaseServer } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/** The lounge owned by the signed-in Supabase user, if any (first one). */
export async function getOwnedLounge(): Promise<{ userId: string; loungeId: string; loungeName: string; loungeSlug: string } | null> {
  try {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await (sb as unknown as SupabaseClient).from('lounges').select('id, name, slug').eq('owner_id', user.id).limit(1).maybeSingle();
    if (!data) return null;
    return { userId: user.id, loungeId: (data as { id: string }).id, loungeName: (data as { name: string }).name, loungeSlug: (data as { slug: string }).slug };
  } catch { return null; }
}
