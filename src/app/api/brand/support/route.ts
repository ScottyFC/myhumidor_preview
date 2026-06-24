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
  if (!b.subject || !b.body) return NextResponse.json({ ok: false, error: 'Add a subject and a message.' }, { status: 400 });
  const { error } = await sb.from('support_tickets').insert({
    brand_id: s.brandId, email: s.email, subject: String(b.subject).slice(0, 200), body: String(b.body).slice(0, 4000),
    priority: s.brand.tier === 'premium',
  } as never);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
