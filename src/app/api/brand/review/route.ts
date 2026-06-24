import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc();
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  if (!b.cigarName) return NextResponse.json({ ok: false, error: 'Which cigar?' }, { status: 400 });
  // Priority is a premium entitlement — decided server-side, not by the client.
  const priority = s.brand.tier === 'premium';
  const { error } = await sb.from('brand_review_requests').insert({
    brand_id: s.brandId, cigar_name: b.cigarName, cigar_slug: b.cigarSlug ?? null, message: b.message ?? null, priority,
  } as never);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, priority });
}
