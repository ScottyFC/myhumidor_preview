import { NextResponse } from 'next/server';
import { getOwnedLounge, validateLoungeCsrf } from '@/lib/lounge-broker';
import { addBrandNotification, emailBrand } from '@/lib/brand-auth';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const lounge = await getOwnedLounge();
  if (!lounge) return NextResponse.json({ ok: false, error: 'You must be signed in as a lounge owner to order.' }, { status: 401 });
  if (!validateLoungeCsrf(req)) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const rl = await checkRateLimit(`order:${lounge.loungeId}:${clientIp(req)}`, { max: 20, windowSec: 3600 });
  if (!rl.allowed) return NextResponse.json({ ok: false, error: 'Too many orders just now — try again shortly.' }, { status: 429 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const brandId = b.brandId as string;
  const items = Array.isArray(b.items) ? b.items : [];
  if (!brandId || items.length === 0) return NextResponse.json({ ok: false, error: 'Choose at least one item.' }, { status: 400 });

  // Price the order from authoritative listing data.
  const ids = items.map((i: { listingId: string }) => i.listingId);
  const { data: listings } = await svc.from('brand_wholesale_listings').select('id, brand_id, cigar_name, price_per_box_cents, moq_boxes, boxes_available, status').in('id', ids);
  const byId = new Map((listings ?? []).map((l: Record<string, unknown>) => [l.id as string, l]));
  let total = 0; const lineItems: Record<string, unknown>[] = [];
  for (const it of items) {
    const l = byId.get(it.listingId) as Record<string, unknown> | undefined;
    if (!l || l.brand_id !== brandId) return NextResponse.json({ ok: false, error: 'Invalid item in order.' }, { status: 400 });
    const boxes = Math.max(1, parseInt(it.boxes, 10) || 0);
    if (l.status !== 'active') return NextResponse.json({ ok: false, error: `${l.cigar_name} is not available.` }, { status: 400 });
    if (boxes < (l.moq_boxes as number)) return NextResponse.json({ ok: false, error: `${l.cigar_name}: minimum ${l.moq_boxes} boxes.` }, { status: 400 });
    const avail = l.boxes_available as number | null;  // null = no cap, 0 = sold out, >0 = capped
    if (avail !== null) {
      if (avail <= 0) return NextResponse.json({ ok: false, error: `${l.cigar_name} is out of stock.` }, { status: 400 });
      if (boxes > avail) return NextResponse.json({ ok: false, error: `${l.cigar_name}: only ${avail} boxes available.` }, { status: 400 });
    }
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
  const dollars = (total / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  await addBrandNotification(brandId, 'order', 'New wholesale order', `${lounge.loungeName} placed an order — $${dollars}.`, '/brand#orders');
  await emailBrand(brandId, 'New wholesale order on MyHumidor', `<p><strong>${lounge.loungeName}</strong> placed a wholesale order totaling $${dollars}. Review it in your brand dashboard.</p>`);
  return NextResponse.json({ ok: true, id: orderId, total: total / 100 });
}
