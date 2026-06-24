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
  const row: Record<string, unknown> = {};
  if (b.logoUrl !== undefined) row.logo_url = b.logoUrl;
  if (b.bannerUrl !== undefined) row.banner_url = b.bannerUrl;
  if (b.description !== undefined) row.description = b.description;
  if (b.website !== undefined) row.website = b.website;
  if (b.hq !== undefined) row.hq = b.hq;
  const { error } = await sb.from('brands').update(row as never).eq('id', s.brandId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
