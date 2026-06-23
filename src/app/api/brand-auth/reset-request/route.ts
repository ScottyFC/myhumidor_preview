import { NextResponse } from 'next/server';
import { verifyRecaptcha, getAccountByEmail, createPasswordReset, sendBrandEmail } from '@/lib/brand-auth';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const { email, recaptchaToken } = b;

  // Rate-limit by IP and by email to prevent abuse / email bombing.
  const ipLim = await checkRateLimit(`brandreset:ip:${clientIp(req)}`, { max: 8, windowSec: 3600, lockSec: 3600 });
  if (!ipLim.allowed) return NextResponse.json({ ok: true }); // generic — never reveal anything
  if (!(await verifyRecaptcha(recaptchaToken))) return NextResponse.json({ ok: false, error: 'Captcha failed.' }, { status: 400 });
  if (email) {
    await checkRateLimit(`brandreset:email:${String(email).toLowerCase()}`, { max: 4, windowSec: 3600, lockSec: 3600 });
    const acct = await getAccountByEmail(String(email));
    if (acct && acct.status === 'active') {
      const token = await createPasswordReset(acct.id);
      if (token) {
        const origin = new URL(req.url).origin;
        const link = `${origin}/brand/reset?token=${token}`;
        await sendBrandEmail(String(email), 'Reset your MyHumidor brand password',
          `<p>Reset your brand password using the link below (valid for 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you didn’t request this, ignore this email.</p>`);
      }
    }
  }
  // Always generic: don't reveal whether an account exists.
  return NextResponse.json({ ok: true });
}
