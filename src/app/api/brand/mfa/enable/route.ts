import { NextResponse } from 'next/server';
import { getBrandSession, validateCsrf, getAccountMfa, setAccountTotpSecret, verifyTotp } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const { code } = await req.json().catch(() => ({}));
  const mfa = await getAccountMfa(s.accountId);
  if (!mfa?.secret) return NextResponse.json({ ok: false, error: 'Start setup first.' }, { status: 400 });
  if (!verifyTotp(String(code ?? ''), mfa.secret)) return NextResponse.json({ ok: false, error: 'That code didn’t match. Try again.' }, { status: 400 });
  await setAccountTotpSecret(s.accountId, mfa.secret, true);
  return NextResponse.json({ ok: true });
}
