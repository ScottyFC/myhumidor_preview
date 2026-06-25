import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazily release held pre-orders whose hold window has passed (no cron): any
 * pending/approved reservation with an elapsed expires_at flips to 'expired',
 * freeing its slot back to general inventory. Call before counting/listing.
 */
export async function expireStalePreorders(svc: SupabaseClient, scope?: { inventoryItemId?: string; loungeId?: string }) {
  try {
    let q = svc.from('preorders').update({ status: 'expired' } as never)
      .in('status', ['pending', 'approved'])
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());
    if (scope?.inventoryItemId) q = q.eq('inventory_item_id', scope.inventoryItemId);
    if (scope?.loungeId) q = q.eq('lounge_id', scope.loungeId);
    await q;
  } catch { /* best effort */ }
}
