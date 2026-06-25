import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const legal = String(b.legalName ?? '').trim();
  const ein = String(b.ein ?? '').trim();
  if (!legal || !ein) return NextResponse.json({ ok: false, error: 'Legal business name and EIN are required.' }, { status: 400 });
  if (!/^\d{2}-?\d{7}$/.test(ein)) return NextResponse.json({ ok: false, error: 'Enter a valid EIN (e.g. 12-3456789).' }, { status: 400 });
  const { error } = await sb.from('brand_tax_submissions').upsert({
    brand_id: s.brandId, legal_name: legal, ein, business_type: b.businessType || null,
    address: b.address || null, contact_email: b.contactEmail || null, status: 'pending', reviewed_by: null, reviewed_at: null,
  } as never, { onConflict: 'brand_id' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await sb.from('brands').update({ verification_status: 'pending' } as never).eq('id', s.brandId);
  return NextResponse.json({ ok: true });
}
