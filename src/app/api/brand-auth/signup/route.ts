import { NextResponse } from 'next/server';
import { hashPassword, verifyRecaptcha, svc, createEmailVerification, sendVerificationEmail, markEmailVerified, emailProviderConfigured } from '@/lib/brand-auth';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  const { contactName, company, email, password, tier, businessAddress, website, phone, taxId, notes, recaptchaToken } = b;

  const ipLim = await checkRateLimit(`brandsignup:ip:${clientIp(req)}`, { max: 5, windowSec: 3600, lockSec: 3600 });
  if (!ipLim.allowed) return NextResponse.json({ ok: false, error: 'Too many applications from this network. Try again later.' }, { status: 429 });
  if (!(await verifyRecaptcha(recaptchaToken))) return NextResponse.json({ ok: false, error: 'Captcha failed. Please try again.' }, { status: 400 });
  if (!contactName || !company || !email || !password) return NextResponse.json({ ok: false, error: 'Please complete the required fields.' }, { status: 400 });
  if (String(password).length < 8) return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
  if (tier === 'standard' && !taxId) return NextResponse.json({ ok: false, error: 'Federal/Tax ID is required for Standard.' }, { status: 400 });

  const sb = svc();
  if (!sb) return NextResponse.json({ ok: false, error: 'Service unavailable.' }, { status: 503 });

  // Atomic: request + account inserted in one transaction (no orphan rows).
  const password_hash = await hashPassword(String(password));
  const { data: accountId, error } = await sb.rpc('create_brand_signup', {
    p_contact_name: contactName, p_company: company, p_email: email, p_password_hash: password_hash,
    p_tier: tier === 'premium' ? 'premium' : 'standard', p_business_address: businessAddress ?? null,
    p_website: website ?? null, p_phone: phone ?? null, p_tax_id: taxId ?? null, p_notes: notes ?? null,
  });
  if (error || !accountId) {
    if (error?.message?.includes('account exists')) return NextResponse.json({ ok: false, error: 'An application already exists for this email.' }, { status: 409 });
    return NextResponse.json({ ok: false, error: error?.message ?? 'Could not create account.' }, { status: 500 });
  }

  // Email verification: send a link if an email provider is configured; otherwise
  // auto-verify (can't verify an address with no way to email it) so the brand isn't
  // locked out — configure RESEND_API_KEY to enforce real verification.
  let emailSent = false;
  if (emailProviderConfigured()) {
    const token = await createEmailVerification(accountId as string);
    if (token) emailSent = await sendVerificationEmail(String(email), new URL(req.url).origin, token);
  } else {
    await markEmailVerified(accountId as string);
  }

  return NextResponse.json({ ok: true, emailSent });
}
