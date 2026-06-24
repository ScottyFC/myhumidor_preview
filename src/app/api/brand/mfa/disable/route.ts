import { NextResponse } from 'next/server';
import { getBrandSession, validateCsrf, getAccountMfa, setAccountTotpSecret, verifyTotp } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const { code } = await req.json().catch(() => ({}));
  const mfa = await getAccountMfa(s.accountId);
  if (!mfa?.enabled) return NextResponse.json({ ok: true });
  // Require a valid current code to turn it off.
  if (!mfa.secret || !verifyTotp(String(code ?? ''), mfa.secret)) return NextResponse.json({ ok: false, error: 'Enter a current code to disable MFA.' }, { status: 400 });
  await setAccountTotpSecret(s.accountId, null, false);
  return NextResponse.json({ ok: true });
}
