'use client';
import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
function db(): SupabaseClient { return supabaseBrowser() as unknown as SupabaseClient; }
import { subscribeAuth } from './auth';

let userId: string | null = null;
let bound = false;
function bind() { if (bound || typeof window === 'undefined') return; bound = true; subscribeAuth((s) => (userId = s?.uuid ?? null)); }

export async function isFollowingBrand(brandId: string): Promise<boolean> {
  bind();
  if (!isSupabaseConfigured || !userId || !brandId) return false;
  try { const { data } = await db().from('brand_follows').select('brand_id').eq('user_id', userId).eq('brand_id', brandId).maybeSingle(); return !!data; } catch { return false; }
}
export async function setBrandFollow(brandId: string, following: boolean): Promise<boolean> {
  bind();
  if (!isSupabaseConfigured || !userId || !brandId) return false;
  try {
    const sb = db();
    if (following) { const { error } = await sb.from('brand_follows').upsert({ user_id: userId, brand_id: brandId }, { onConflict: 'user_id,brand_id' }); return !error; }
    const { error } = await sb.from('brand_follows').delete().eq('user_id', userId).eq('brand_id', brandId); return !error;
  } catch { return false; }
}
export async function brandFollowerCount(brandId: string): Promise<number> {
  if (!isSupabaseConfigured || !brandId) return 0;
  try { const { count } = await db().from('brand_follows').select('*', { count: 'exact', head: true }).eq('brand_id', brandId); return count ?? 0; } catch { return 0; }
}
