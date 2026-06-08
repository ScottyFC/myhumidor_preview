'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { logEvent } from './audit';
import { notifyLoungeFollowers } from './lounge-follows';

export type PostKind = 'deal' | 'new_arrival' | 'event';

export interface LoungePost {
  id: string;
  loungeId: string;
  kind: PostKind;
  title: string;
  body?: string;
  promoted: boolean;
  eventAt?: string;
  createdAt: string;
}

type Row = {
  id: string; lounge_id: string; kind: PostKind; title: string; body: string | null;
  promoted: boolean | null; event_at: string | null; created_at: string | null;
};
function rowTo(r: Row): LoungePost {
  return {
    id: r.id, loungeId: r.lounge_id, kind: r.kind, title: r.title, body: r.body ?? undefined,
    promoted: r.promoted ?? false, eventAt: r.event_at ?? undefined, createdAt: r.created_at ?? new Date().toISOString(),
  };
}
const SELECT = 'id, lounge_id, kind, title, body, promoted, event_at, created_at';

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
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabaseBrowser().from('lounge_posts').insert({
      lounge_id: input.loungeId,
      kind: input.kind,
      title: input.title,
      body: input.body || null,
      event_at: input.eventAt || null,
    });
    if (error) {
      console.error('[posts] create failed:', error.message);
      return false;
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
    return true;
  } catch {
    return false;
  }
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
  deal: 'Deal',
  new_arrival: 'New arrival',
  event: 'Event',
};
