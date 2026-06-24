import { NextResponse } from 'next/server';
import { verifyRecaptcha, getAccountByEmail, createEmailVerification, sendVerificationEmail, emailProviderConfigured, svc } from '@/lib/brand-auth';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { email, recaptchaToken } = await req.json().catch(() => ({}));
  const ipLim = await checkRateLimit(`brandverifyresend:ip:${clientIp(req)}`, { max: 6, windowSec: 3600, lockSec: 3600 });
  if (!ipLim.allowed) return NextResponse.json({ ok: true }); // generic
  if (!(await verifyRecaptcha(recaptchaToken))) return NextResponse.json({ ok: false, error: 'Captcha failed.' }, { status: 400 });
  if (!emailProviderConfigured()) return NextResponse.json({ ok: true, note: 'Email isn’t configured; contact MyHumidor.' });
  if (email) {
    await checkRateLimit(`brandverifyresend:email:${String(email).toLowerCase()}`, { max: 4, windowSec: 3600, lockSec: 3600 });
    const acct = await getAccountByEmail(String(email));
    // Only resend for an existing, not-yet-verified account.
    const sb = svc();
    if (acct && sb) {
      const { data } = await sb.from('brand_auth_accounts').select('email_verified').eq('id', acct.id).maybeSingle();
      if (data && !(data as { email_verified: boolean }).email_verified) {
        const token = await createEmailVerification(acct.id);
        if (token) await sendVerificationEmail(String(email), new URL(req.url).origin, token);
      }
    }
  }
  return NextResponse.json({ ok: true }); // generic — no enumeration
}
