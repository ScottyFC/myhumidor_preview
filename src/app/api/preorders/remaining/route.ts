import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';
import { expireStalePreorders } from '@/lib/preorder-expiry';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

// Public: remaining pre-order slots per coming-soon item for a lounge. Returns a
// map of inventory_item_id -> remaining. (Counts only; no personal data.)
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug');
  if (!slug) return NextResponse.json({ remaining: {} });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ remaining: {} });
  try {
    const { data: lounge } = await svc.from('lounges').select('id').eq('slug', slug).maybeSingle();
    const loungeId = (lounge as { id: string } | null)?.id;
    if (!loungeId) return NextResponse.json({ remaining: {} });
    await expireStalePreorders(svc, { loungeId });
    const { data: items } = await svc.from('inventory_items').select('id, preorder_limit').eq('lounge_id', loungeId).eq('coming_soon', true).eq('preorder_enabled', true);
    const out: Record<string, number> = {};
    for (const it of ((items ?? []) as { id: string; preorder_limit: number }[])) {
      const { count } = await svc.from('preorders').select('*', { count: 'exact', head: true }).eq('inventory_item_id', it.id).in('status', ['pending', 'approved', 'fulfilled']);
      out[it.id] = Math.max(0, it.preorder_limit - (count ?? 0));
    }
    return NextResponse.json({ remaining: out });
  } catch { return NextResponse.json({ remaining: {} }); }
}
