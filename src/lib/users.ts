'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';

export interface UserHit {
  handle: string;
  displayName: string;
  avatarUrl?: string;
  accountType: 'consumer' | 'retailer';
}

/** Search members by handle or display name. Supabase only (profiles are public). */
export async function searchUsers(query: string, limit = 12): Promise<UserHit[]> {
  const q = query.trim();
  if (!isSupabaseConfigured || q.length < 1) return [];
  try {
    const term = `%${q}%`;
    const { data, error } = await supabaseBrowser()
      .from('profiles')
      .select('handle, display_name, avatar_url, account_type')
      .or(`handle.ilike.${term},display_name.ilike.${term}`)
      .limit(limit);
    if (error) {
      console.error('[users] search failed:', error.message);
      return [];
    }
    return (data ?? []).map((p) => ({
      handle: p.handle,
      displayName: p.display_name ?? p.handle,
      avatarUrl: p.avatar_url ?? undefined,
      accountType: (p.account_type === 'consumer' ? 'consumer' : 'retailer'),
    }));
  } catch {
    return [];
  }
}
