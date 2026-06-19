import { isSupabaseConfigured, supabaseBrowser } from './supabase';

export interface StaffMember {
  userId: string; handle: string; displayName: string;
  canPost: boolean; canInventory: boolean; canEdit: boolean;
}

export async function getStaff(loungeSlug: string): Promise<StaffMember[]> {
  if (!isSupabaseConfigured) return [];
  const sb = supabaseBrowser();
  const { data: l } = await sb.from('lounges').select('id').eq('slug', loungeSlug).maybeSingle();
  if (!l) return [];
  const { data } = await sb.from('lounge_staff')
    .select('user_id, can_post, can_inventory, can_edit, profiles!inner(handle, display_name)')
    .eq('lounge_id', l.id);
  type Row = { user_id: string; can_post: boolean; can_inventory: boolean; can_edit: boolean; profiles: { handle: string; display_name: string | null } };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    userId: r.user_id, handle: r.profiles.handle, displayName: r.profiles.display_name ?? r.profiles.handle,
    canPost: r.can_post, canInventory: r.can_inventory, canEdit: r.can_edit,
  }));
}

export async function setStaff(loungeSlug: string, handle: string, access: { post: boolean; inventory: boolean; edit: boolean }): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not connected.' };
  const { error } = await supabaseBrowser().rpc('set_lounge_staff', {
    p_slug: loungeSlug, p_handle: handle.replace(/^@/, ''), p_can_post: access.post, p_can_inventory: access.inventory, p_can_edit: access.edit,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeStaff(loungeSlug: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { error } = await supabaseBrowser().rpc('remove_lounge_staff', { p_slug: loungeSlug, p_user: userId });
  return !error;
}

export interface ClaimRequest { id: string; requesterName: string; loungeSlugs: string[]; note: string | null; status: string; createdAt: string }

export async function requestBulkClaim(slugs: string[], note: string, requesterId: string, requesterName: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not connected.' };
  const { error } = await supabaseBrowser().from('lounge_claim_requests').insert({
    requester_id: requesterId, requester_name: requesterName, lounge_slugs: slugs, note: note || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function getClaimRequests(): Promise<ClaimRequest[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabaseBrowser().from('lounge_claim_requests')
    .select('id, requester_name, lounge_slugs, note, status, created_at').eq('status', 'pending').order('created_at', { ascending: false });
  type Row = { id: string; requester_name: string | null; lounge_slugs: string[]; note: string | null; status: string; created_at: string };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id, requesterName: r.requester_name ?? 'A member', loungeSlugs: r.lounge_slugs ?? [], note: r.note, status: r.status, createdAt: r.created_at,
  }));
}

export async function reviewClaim(id: string, approve: boolean): Promise<{ ok: boolean; error?: string; count?: number }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Not connected.' };
  const fn = approve ? 'approve_claim_request' : 'reject_claim_request';
  const { data, error } = await supabaseBrowser().rpc(fn, { p_id: id });
  return error ? { ok: false, error: error.message } : { ok: true, count: typeof data === 'number' ? data : undefined };
}
