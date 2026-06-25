import { NextResponse } from 'next/server';
import { getOwnedLounge } from '@/lib/lounge-broker';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function GET() {
  const lounge = await getOwnedLounge();
  if (!lounge) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await svc.from('broker_orders').select('id, status, total_cents, note, created_at, brands(name, slug), broker_order_items(cigar_name, boxes, price_per_box_cents)').eq('lounge_id', lounge.loungeId).order('created_at', { ascending: false });
  return NextResponse.json({ ok: true, orders: data ?? [] });
}
