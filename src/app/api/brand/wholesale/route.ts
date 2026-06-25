import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf, isBrandVerified } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await sb.from('brand_wholesale_listings').select('*').eq('brand_id', s.brandId).order('created_at', { ascending: false });
  return NextResponse.json({ ok: true, listings: data ?? [] });
}

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data: brow } = await sb.from('brands').select('verified, tier').eq('id', s.brandId).maybeSingle();
  if (!isBrandVerified({ tier: (brow as { tier: string } | null)?.tier ?? s.brand.tier, verified: (brow as { verified: boolean } | null)?.verified })) {
    return NextResponse.json({ ok: false, error: 'Your brand must be verified before selling wholesale. Submit your tax information to get verified.' }, { status: 403 });
  }
  const b = await req.json().catch(() => ({}));
  if (!String(b.cigarName ?? '').trim()) return NextResponse.json({ ok: false, error: 'Cigar name required.' }, { status: 400 });
  const price = Math.round(Number(b.pricePerBox) * 100);
  if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ ok: false, error: 'Enter a valid price per box.' }, { status: 400 });
  const { data, error } = await sb.from('brand_wholesale_listings').insert({
    brand_id: s.brandId, cigar_name: String(b.cigarName).trim(), vitola: b.vitola || null, slug: b.slug || null,
    cigars_per_box: Math.max(1, parseInt(b.cigarsPerBox, 10) || 20), price_per_box_cents: price,
    boxes_available: Math.max(0, parseInt(b.boxesAvailable, 10) || 0), moq_boxes: Math.max(1, parseInt(b.moqBoxes, 10) || 1),
    image_url: b.imageUrl || null, status: 'active',
  } as never).select('id').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}

export async function PATCH(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, error: 'Missing listing.' }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (b.cigarName !== undefined) patch.cigar_name = String(b.cigarName).trim();
  if (b.vitola !== undefined) patch.vitola = b.vitola || null;
  if (b.cigarsPerBox !== undefined) patch.cigars_per_box = Math.max(1, parseInt(b.cigarsPerBox, 10) || 20);
  if (b.pricePerBox !== undefined) patch.price_per_box_cents = Math.round(Number(b.pricePerBox) * 100);
  if (b.boxesAvailable !== undefined) patch.boxes_available = Math.max(0, parseInt(b.boxesAvailable, 10) || 0);
  if (b.moqBoxes !== undefined) patch.moq_boxes = Math.max(1, parseInt(b.moqBoxes, 10) || 1);
  if (b.status !== undefined && ['active', 'paused'].includes(b.status)) patch.status = b.status;
  if (b.imageUrl !== undefined) patch.image_url = b.imageUrl || null;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: 'Nothing to update.' }, { status: 400 });
  const { error } = await sb.from('brand_wholesale_listings').update(patch as never).eq('id', b.id).eq('brand_id', s.brandId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id.' }, { status: 400 });
  const { error } = await sb.from('brand_wholesale_listings').delete().eq('id', id).eq('brand_id', s.brandId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
