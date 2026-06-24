import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf, verifyPassword, hashPassword } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc();
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { current, next } = await req.json().catch(() => ({}));
  if (!next || String(next).length < 8) return NextResponse.json({ ok: false, error: 'New password must be at least 8 characters.' }, { status: 400 });

  const { data } = await sb.from('brand_auth_accounts').select('password_hash').eq('id', s.accountId).maybeSingle();
  const hash = (data as { password_hash: string } | null)?.password_hash;
  if (!hash || !(await verifyPassword(String(current ?? ''), hash))) return NextResponse.json({ ok: false, error: 'Current password is incorrect.' }, { status: 400 });

  const password_hash = await hashPassword(String(next));
  const { error } = await sb.from('brand_auth_accounts').update({ password_hash } as never).eq('id', s.accountId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }); // current session kept (no forced logout from settings)
}
