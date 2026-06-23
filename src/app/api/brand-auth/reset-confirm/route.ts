import { NextResponse } from 'next/server';
import { verifyRecaptcha, consumePasswordReset, setAccountPassword } from '@/lib/brand-auth';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const { token, password, recaptchaToken } = b;

  const ipLim = await checkRateLimit(`brandresetc:ip:${clientIp(req)}`, { max: 20, windowSec: 3600, lockSec: 3600 });
  if (!ipLim.allowed) return NextResponse.json({ ok: false, error: 'Too many attempts. Try again later.' }, { status: 429 });
  if (!(await verifyRecaptcha(recaptchaToken))) return NextResponse.json({ ok: false, error: 'Captcha failed.' }, { status: 400 });
  if (!token || !password || String(password).length < 8) return NextResponse.json({ ok: false, error: 'Enter a new password of at least 8 characters.' }, { status: 400 });

  const accountId = await consumePasswordReset(String(token));
  if (!accountId) return NextResponse.json({ ok: false, error: 'This reset link is invalid or expired.' }, { status: 400 });
  const ok = await setAccountPassword(accountId, String(password));
  if (!ok) return NextResponse.json({ ok: false, error: 'Could not reset password.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
