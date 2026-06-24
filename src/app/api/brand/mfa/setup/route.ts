import { NextResponse } from 'next/server';
import { getBrandSession, validateCsrf, getAccountMfa, setAccountTotpSecret, generateTotpSecret, totpUri, totpQrDataUrl } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const mfa = await getAccountMfa(s.accountId);
  if (mfa?.enabled) return NextResponse.json({ ok: false, error: 'MFA is already enabled.' }, { status: 400 });

  const secret = generateTotpSecret();
  await setAccountTotpSecret(s.accountId, secret, false); // staged, not yet enabled
  const uri = totpUri(s.brand.name || 'brand', secret);
  const qr = await totpQrDataUrl(uri);
  return NextResponse.json({ ok: true, secret, uri, qr });
}
