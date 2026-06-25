'use client';

/**
 * Lounge inventory + published menu. Supabase `inventory_items` (keyed to the
 * lounge by slug → id) when configured, localStorage otherwise. The public
 * lounge page shows only published items.
 */

import { isSupabaseConfigured, supabaseBrowser } from './supabase';
import { logEvent } from './audit';

export interface InventoryItem {
  id?: string;
  cigarId: string;
  slug?: string;
  brand: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
  comingSoon?: boolean;
  releaseDate?: string | null;
  preorderEnabled?: boolean;
  preorderLimit?: number;
  preorderPerUserLimit?: number;
  preorderHoldHours?: number;
}

const invKey = (id: string) => `myhumidor:inventory:${id}`;
const pubKey = (id: string) => `myhumidor:published:${id}`;

async function loungeIdForSlug(slug: string): Promise<string | null> {
  try {
    const { data } = await supabaseBrowser().from('lounges').select('id').eq('slug', slug).single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

type Row = {
  id?: string; cigar_id: string; slug: string | null; brand: string | null; name: string | null;
  size: string | null; price: number | null; quantity: number | null;
  coming_soon?: boolean | null; release_date?: string | null; preorder_enabled?: boolean | null; preorder_limit?: number | null;
  preorder_per_user_limit?: number | null; preorder_hold_hours?: number | null;
};
const SELECT = 'id, cigar_id, slug, brand, name, size, price, quantity, coming_soon, release_date, preorder_enabled, preorder_limit, preorder_per_user_limit, preorder_hold_hours';
function rowTo(r: Row): InventoryItem {
  return {
    id: r.id, cigarId: r.cigar_id, slug: r.slug ?? '', brand: r.brand ?? '', name: r.name ?? '',
    size: r.size ?? '', price: Number(r.price ?? 0), quantity: r.quantity ?? 1,
    comingSoon: !!r.coming_soon, releaseDate: r.release_date ?? null, preorderEnabled: !!r.preorder_enabled, preorderLimit: r.preorder_limit ?? 0,
    preorderPerUserLimit: r.preorder_per_user_limit ?? 1, preorderHoldHours: r.preorder_hold_hours ?? 0,
  };
}
function localRead(key: string): InventoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]');
  } catch {
    return [];
  }
}

export async function getInventory(slug: string, localId?: string): Promise<InventoryItem[]> {
  if (isSupabaseConfigured) {
    const lid = await loungeIdForSlug(slug);
    if (!lid) return [];
    const { data, error } = await supabaseBrowser().from('inventory_items').select(SELECT).eq('lounge_id', lid);
    if (error) {
      console.error('[inventory] load failed:', error.message);
      return [];
    }
    return ((data ?? []) as unknown as Row[]).map((r) => rowTo(r));
  }
  return localRead(invKey(localId ?? slug));
}

export async function getPublishedMenu(slug: string, localId?: string): Promise<InventoryItem[]> {
  if (isSupabaseConfigured) {
    const lid = await loungeIdForSlug(slug);
    if (!lid) return [];
    const { data, error } = await supabaseBrowser()
      .from('inventory_items')
      .select(SELECT)
      .eq('lounge_id', lid)
      .eq('published', true);
    if (error) {
      console.error('[inventory] published load failed:', error.message);
      return [];
    }
    return ((data ?? []) as unknown as Row[]).map((r) => rowTo(r));
  }
  return localRead(pubKey(localId ?? slug));
}

export async function saveInventory(slug: string, items: InventoryItem[], localId?: string): Promise<boolean> {
  if (isSupabaseConfigured) {
    const lid = await loungeIdForSlug(slug);
    if (!lid) return false;
    const sb = supabaseBrowser();
    if (items.length) {
      const rows = items.map((i) => ({
        lounge_id: lid, cigar_id: i.cigarId, slug: i.slug ?? null, brand: i.brand, name: i.name,
        size: i.size, price: i.price, quantity: i.quantity,
        coming_soon: !!i.comingSoon, release_date: i.releaseDate || null,
        preorder_enabled: !!i.preorderEnabled, preorder_limit: i.preorderLimit ?? 0,
        preorder_per_user_limit: i.preorderPerUserLimit ?? 1, preorder_hold_hours: i.preorderHoldHours ?? 0,
      }));
      const { error } = await (sb as unknown as import('@supabase/supabase-js').SupabaseClient).from('inventory_items').upsert(rows as never, { onConflict: 'lounge_id,cigar_id' });
      if (error) {
        console.error('[inventory] save failed:', error.message);
        return false;
      }
    }
    // remove any items no longer in the set
    let del = sb.from('inventory_items').delete().eq('lounge_id', lid);
    const ids = items.map((i) => i.cigarId);
    if (ids.length) del = del.not('cigar_id', 'in', `(${ids.join(',')})`);
    const { error: delErr } = await del;
    if (delErr) console.error('[inventory] prune failed:', delErr.message);
    return true;
  }
  try {
    localStorage.setItem(invKey(localId ?? slug), JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export async function publishMenu(slug: string, items: InventoryItem[], localId?: string): Promise<boolean> {
  if (isSupabaseConfigured) {
    const ok = await saveInventory(slug, items, localId);
    if (!ok) return false;
    const lid = await loungeIdForSlug(slug);
    if (!lid) return false;
    const { error } = await supabaseBrowser().from('inventory_items').update({ published: true }).eq('lounge_id', lid);
    if (error) {
      console.error('[inventory] publish failed:', error.message);
      return false;
    }
    logEvent({
      action: 'inventory.published',
      entityType: 'lounge',
      entityId: slug,
      entityName: slug,
      loungeId: lid,
      meta: { items: items.length },
    });
    return true;
  }
  try {
    localStorage.setItem(pubKey(localId ?? slug), JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

/* ── Add-to-inventory from a cigar page (single item, no prune) ─────────────── */

/** Upsert one cigar into a lounge's inventory without disturbing the rest. */
export async function addOneToInventory(
  loungeSlug: string,
  item: { cigarId: string; slug?: string; brand: string; name: string; size?: string; price: number | null; quantity: number },
  publish: boolean,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const lid = await loungeIdForSlug(loungeSlug);
  if (!lid) return false;
  const { error } = await supabaseBrowser().from('inventory_items').upsert({
    lounge_id: lid, cigar_id: item.cigarId, slug: item.slug ?? null,
    brand: item.brand, name: item.name, size: item.size ?? null,
    price: item.price, quantity: item.quantity, published: publish,
  }, { onConflict: 'lounge_id,cigar_id' });
  if (error) { console.error('[inventory] add one failed:', error.message); return false; }
  return true;
}
