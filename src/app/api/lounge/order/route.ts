import { NextResponse } from 'next/server';
import { getOwnedLounge } from '@/lib/lounge-broker';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const lounge = await getOwnedLounge();
  if (!lounge) return NextResponse.json({ ok: false, error: 'You must be signed in as a lounge owner to order.' }, { status: 401 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const brandId = b.brandId as string;
  const items = Array.isArray(b.items) ? b.items : [];
  if (!brandId || items.length === 0) return NextResponse.json({ ok: false, error: 'Choose at least one item.' }, { status: 400 });

  // Price the order from authoritative listing data.
  const ids = items.map((i: { listingId: string }) => i.listingId);
  const { data: listings } = await svc.from('brand_wholesale_listings').select('id, brand_id, cigar_name, price_per_box_cents, moq_boxes').in('id', ids);
  const byId = new Map((listings ?? []).map((l: Record<string, unknown>) => [l.id as string, l]));
  let total = 0; const lineItems: Record<string, unknown>[] = [];
  for (const it of items) {
    const l = byId.get(it.listingId) as Record<string, unknown> | undefined;
    if (!l || l.brand_id !== brandId) return NextResponse.json({ ok: false, error: 'Invalid item in order.' }, { status: 400 });
    const boxes = Math.max(1, parseInt(it.boxes, 10) || 0);
    if (boxes < (l.moq_boxes as number)) return NextResponse.json({ ok: false, error: `${l.cigar_name}: minimum ${l.moq_boxes} boxes.` }, { status: 400 });
    const price = l.price_per_box_cents as number;
    total += price * boxes;
    lineItems.push({ listing_id: l.id, cigar_name: l.cigar_name, boxes, price_per_box_cents: price });
  }

  const { data: order, error } = await svc.from('broker_orders').insert({ brand_id: brandId, lounge_id: lounge.loungeId, total_cents: total, note: b.note || null, status: 'placed' } as never).select('id').single();
  if (error || !order) return NextResponse.json({ ok: false, error: error?.message ?? 'Could not place order.' }, { status: 500 });
  const orderId = (order as { id: string }).id;
  await svc.from('broker_order_items').insert(lineItems.map((li) => ({ ...li, order_id: orderId })) as never);
  // Ensure a message thread exists between this lounge and brand.
  await svc.from('broker_threads').upsert({ brand_id: brandId, lounge_id: lounge.loungeId, last_message_at: new Date().toISOString() } as never, { onConflict: 'brand_id,lounge_id' });
  return NextResponse.json({ ok: true, id: orderId, total: total / 100 });
}
