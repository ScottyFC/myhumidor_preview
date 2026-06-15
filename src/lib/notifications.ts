'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { subscribeAuth } from './auth';
import { subscribeTable } from './realtime';

let actorId: string | null = null;
let actorName = '';
let bound = false;
function bind() {
  if (bound || typeof window === 'undefined') return;
  bound = true;
  subscribeAuth((s) => {
    actorId = s?.uuid ?? null;
    actorName = s?.displayName ?? '';
  });
}

export type NotificationType = 'follow' | 'like' | 'comment' | 'lounge_post' | 'check_in';

export interface AppNotification {
  id: string;
  actorName: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  read: boolean;
  createdAt: string;
}

/** Create a notification for `recipientId` from the signed-in actor. */
export async function notify(recipientId: string, input: {
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  entityName?: string;
}) {
  bind();
  if (!isSupabaseConfigured || !actorId || !recipientId || recipientId === actorId) return;
  try {
    await supabaseBrowser().from('notifications').insert({
      user_id: recipientId,
      actor_id: actorId,
      actor_name: actorName || 'Someone',
      type: input.type,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      entity_name: input.entityName ?? null,
    });
  } catch {
    /* non-critical */
  }
}

type Row = {
  id: string; actor_name: string | null; type: NotificationType; entity_type: string | null;
  entity_id: string | null; entity_name: string | null; read: boolean | null; created_at: string | null;
};
function rowTo(r: Row): AppNotification {
  return {
    id: r.id, actorName: r.actor_name ?? 'Someone', type: r.type, entityType: r.entity_type ?? undefined,
    entityId: r.entity_id ?? undefined, entityName: r.entity_name ?? undefined,
    read: r.read ?? false, createdAt: r.created_at ?? new Date().toISOString(),
  };
}

export async function getNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  if (!isSupabaseConfigured || !userId) return [];
  try {
    const { data } = await supabaseBrowser()
      .from('notifications')
      .select('id, actor_name, type, entity_type, entity_id, entity_name, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return ((data ?? []) as Row[]).map((r) => rowTo(r));
  } catch {
    return [];
  }
}

export async function markAllRead(userId: string) {
  if (!isSupabaseConfigured || !userId) return;
  try {
    await supabaseBrowser().from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  } catch {
    /* ignore */
  }
}

export function subscribeNotifications(cb: () => void): () => void {
  return subscribeTable('notifications', cb);
}

export function describeNotification(n: AppNotification): string {
  const who = n.actorName;
  const what = n.entityName ? ` ${n.entityName}` : '';
  switch (n.type) {
    case 'follow': return `${who} started following you`;
    case 'like': return `${who} liked your${what || ' post'}`;
    case 'comment': return `${who} commented on your${what || ' post'}`;
    case 'lounge_post': return `${who} posted:${what}`;
    case 'check_in': return `${who} checked in${what ? ` with${what}` : ''}`;
    default: return `${who} sent an update`;
  }
}

/* ── Settings ──────────────────────────────────────────────────────────────── */
export interface NotifySettings {
  notify_follows: boolean;
  notify_likes: boolean;
  notify_comments: boolean;
  notify_lounges: boolean;
}

export async function getNotifySettings(userId: string): Promise<NotifySettings> {
  const fallback = { notify_follows: true, notify_likes: true, notify_comments: true, notify_lounges: true };
  if (!isSupabaseConfigured || !userId) return fallback;
  try {
    const { data } = await supabaseBrowser()
      .from('profiles')
      .select('notify_follows, notify_likes, notify_comments, notify_lounges')
      .eq('id', userId)
      .single();
    return { ...fallback, ...(data ?? {}) };
  } catch {
    return fallback;
  }
}

export async function saveNotifySettings(userId: string, s: Partial<NotifySettings>): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;
  try {
    const { error } = await supabaseBrowser().from('profiles').update(s).eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}
