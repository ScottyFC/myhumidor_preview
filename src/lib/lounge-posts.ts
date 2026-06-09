'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { logEvent } from './audit';
import { notifyLoungeFollowers } from './lounge-follows';

export type PostKind = 'deal' | 'new_arrival' | 'event' | 'update';

export interface LoungePost {
  id: string;
  loungeId: string;
  kind: PostKind;
  title: string;
  body?: string;
  promoted: boolean;
  eventAt?: string;
  photoUrl?: string;
  createdAt: string;
}

type Row = {
  id: string; lounge_id: string; kind: PostKind; title: string; body: string | null;
  promoted: boolean | null; event_at: string | null; created_at: string | null;
  photo_url?: string | null; boost_until?: string | null;
};
function rowTo(r: Row): LoungePost {
  return {
    id: r.id, loungeId: r.lounge_id, kind: r.kind, title: r.title, body: r.body ?? undefined,
    promoted: r.promoted ?? false, eventAt: r.event_at ?? undefined,
    photoUrl: r.photo_url ?? undefined, createdAt: r.created_at ?? new Date().toISOString(),
  };
}
const SELECT = 'id, lounge_id, kind, title, body, promoted, event_at, created_at, photo_url, boost_until';

export async function loungeIdForSlug(slug: string): Promise<string | null> {
  if (!isSupabaseConfigured || !slug) return null;
  try {
    const { data } = await supabaseBrowser().from('lounges').select('id').eq('slug', slug).single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function getPostsForSlug(slug: string, limit = 20): Promise<LoungePost[]> {
  const id = await loungeIdForSlug(slug);
  return id ? getPostsForLounge(id, limit) : [];
}

export async function getPostsForLounge(loungeId: string, limit = 20): Promise<LoungePost[]> {
  if (!isSupabaseConfigured || !loungeId) return [];
  try {
    const { data, error } = await supabaseBrowser()
      .from('lounge_posts')
      .select(SELECT)
      .eq('lounge_id', loungeId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('[posts] load failed:', error.message);
      return [];
    }
    return (data ?? []).map((r) => rowTo(r as Row));
  } catch {
    return [];
  }
}

export async function createPost(input: {
  loungeId: string;
  loungeName?: string;
  kind: PostKind;
  title: string;
  body?: string;
  eventAt?: string;
  photoDataUrl?: string;
  boostCredits?: number;   // spend credits to promote this post for 7 days
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not connected.' };
  try {
    // Optional: spend credits to boost (server-checked).
    let boostUntil: string | null = null;
    if (input.boostCredits && input.boostCredits > 0) {
      const { error: spendErr } = await supabaseBrowser().rpc('spend_credits', {
        p_lounge: input.loungeId, p_amount: input.boostCredits, p_reason: 'post_boost',
      });
      if (spendErr) return { ok: false, error: /insufficient/i.test(spendErr.message) ? 'Not enough credits to boost.' : spendErr.message };
      boostUntil = new Date(Date.now() + 7 * 86400000).toISOString();
    }

    let photo_url: string | null = null;
    if (input.photoDataUrl?.startsWith('data:')) photo_url = await uploadPostPhoto(input.photoDataUrl);

    const { error } = await supabaseBrowser().from('lounge_posts').insert({
      lounge_id: input.loungeId,
      kind: input.kind,
      title: input.title,
      body: input.body || null,
      event_at: input.eventAt || null,
      photo_url,
      promoted: !!boostUntil,
      boost_until: boostUntil,
    });
    if (error) {
      console.error('[posts] create failed:', error.message);
      return { ok: false, error: error.message };
    }
    logEvent({
      action: 'post.created',
      entityType: 'lounge',
      entityId: input.loungeId,
      entityName: input.loungeName ?? input.title,
      loungeId: input.loungeId,
      meta: { kind: input.kind, title: input.title },
    });
    // Notify everyone who follows this lounge.
    notifyLoungeFollowers(input.loungeId, input.loungeName ?? 'A lounge', input.title);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not publish.' };
  }
}

async function uploadPostPhoto(dataUrl: string): Promise<string | null> {
  try {
    const sb = supabaseBrowser();
    const blob = await (await fetch(dataUrl)).blob();
    const path = `lounge-posts/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
    const { error } = await sb.storage.from('avatars').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
    if (error) { console.error('[posts] photo upload failed:', error.message); return null; }
    return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  } catch { return null; }
}

export async function deletePost(id: string, loungeId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabaseBrowser().from('lounge_posts').delete().eq('id', id);
    if (error) {
      console.error('[posts] delete failed:', error.message);
      return false;
    }
    logEvent({ action: 'post.deleted', entityType: 'lounge', entityId: loungeId, loungeId });
    return true;
  } catch {
    return false;
  }
}

export const KIND_LABEL: Record<PostKind, string> = {
  deal: 'Promo',
  new_arrival: 'New cigars',
  event: 'Event',
  update: 'Store update',
};
