import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
const STATUSES = ['placed', 'accepted', 'declined', 'shipped', 'cancelled'];

export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await sb.from('broker_orders').select('id, status, total_cents, note, created_at, lounges(name, slug, city, state), broker_order_items(cigar_name, boxes, price_per_box_cents)').eq('brand_id', s.brandId).order('created_at', { ascending: false });
  return NextResponse.json({ ok: true, orders: data ?? [] });
}

export async function PATCH(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  if (!b.id || !STATUSES.includes(b.status)) return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  const { error } = await sb.from('broker_orders').update({ status: b.status, updated_at: new Date().toISOString() } as never).eq('id', b.id).eq('brand_id', s.brandId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
