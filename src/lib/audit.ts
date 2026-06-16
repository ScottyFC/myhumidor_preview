'use client';

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import type { Json } from '@/types/database.types';
import { subscribeAuth } from './auth';

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

export interface AuditEvent {
  id: string;
  actorName: string;
  action: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  loungeId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface LogInput {
  action: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  loungeId?: string | null;
  meta?: Record<string, unknown>;
}

/** Fire-and-forget: record a change to the audit log. */
export function logEvent(input: LogInput) {
  bind();
  if (!isSupabaseConfigured || !actorId) return;
  supabaseBrowser()
    .from('audit_events')
    .insert({
      actor_id: actorId,
      actor_name: actorName || 'Someone',
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      entity_name: input.entityName ?? null,
      lounge_id: input.loungeId ?? null,
      meta: (input.meta ?? null) as Json,
    })
    .then((r: { error: { message: string } | null }) => { if (r.error) { console.error('[audit] log failed:', r.error.message) } });
}

type Row = {
  id: string; actor_name: string | null; action: string; entity_type: string | null;
  entity_id: string | null; entity_name: string | null; lounge_id: string | null;
  meta: Record<string, unknown> | null; created_at: string | null;
};
function rowTo(r: Row): AuditEvent {
  return {
    id: r.id, actorName: r.actor_name ?? 'Someone', action: r.action,
    entityType: r.entity_type ?? undefined, entityId: r.entity_id ?? undefined,
    entityName: r.entity_name ?? undefined, loungeId: r.lounge_id ?? undefined,
    meta: r.meta ?? undefined, createdAt: r.created_at ?? new Date().toISOString(),
  };
}
const SELECT = 'id, actor_name, action, entity_type, entity_id, entity_name, lounge_id, meta, created_at';

export async function getEvents(limit = 100): Promise<AuditEvent[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabaseBrowser()
      .from('audit_events')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('[audit] read failed:', error.message);
      return [];
    }
    return ((data ?? []) as Row[]).map((r) => rowTo(r));
  } catch {
    return [];
  }
}

export async function getLoungeEvents(loungeId: string, limit = 60): Promise<AuditEvent[]> {
  if (!isSupabaseConfigured || !loungeId) return [];
  try {
    const { data, error } = await supabaseBrowser()
      .from('audit_events')
      .select(SELECT)
      .eq('lounge_id', loungeId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('[audit] lounge read failed:', error.message);
      return [];
    }
    return ((data ?? []) as Row[]).map((r) => rowTo(r));
  } catch {
    return [];
  }
}

/** Human-readable label for an event action. */
export function describeEvent(e: AuditEvent): string {
  const n = e.entityName ? ` “${e.entityName}”` : '';
  switch (e.action) {
    case 'cigar.approved': return `approved cigar${n}`;
    case 'cigar.auto_approved': return `auto-approved cigar${n} (verified lounge)`;
    case 'cigar.rejected': return `rejected cigar${n}`;
    case 'cigar.deleted': return `removed cigar${n} from the catalog`;
    case 'lounge.approved': return `approved lounge${n}`;
    case 'lounge.rejected': return `rejected lounge${n}`;
    case 'lounge.certified': return `certified${n}`;
    case 'lounge.uncertified': return `removed certification from${n}`;
    case 'lounge.claim_approved': return `approved a claim for${n}`;
    case 'lounge.claim_rejected': return `rejected a claim for${n}`;
    case 'lounge.logo_changed': return `updated the photo for${n}`;
    case 'change_request.resolved': return `resolved a change request for${n}`;
    case 'change_request.dismissed': return `dismissed a change request for${n}`;
    case 'admin.promoted': return `promoted an account to super admin`;
    case 'admin.revoked': return `revoked admin from an account`;
    case 'inventory.published': return `published the menu for${n}`;
    case 'profile.removed': return `removed the profile${n}`;
    default: return `${e.action}${n}`;
  }
}
