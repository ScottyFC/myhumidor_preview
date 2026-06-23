import { NextResponse } from 'next/server';
import { hashPassword, verifyRecaptcha, svc } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  const { contactName, company, email, password, tier, businessAddress, website, phone, taxId, notes, recaptchaToken } = b;

  if (!(await verifyRecaptcha(recaptchaToken))) return NextResponse.json({ ok: false, error: 'Captcha failed. Please try again.' }, { status: 400 });
  if (!contactName || !company || !email || !password) return NextResponse.json({ ok: false, error: 'Please complete the required fields.' }, { status: 400 });
  if (String(password).length < 8) return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
  if (tier === 'standard' && !taxId) return NextResponse.json({ ok: false, error: 'Federal/Tax ID is required for Standard.' }, { status: 400 });

  const sb = svc();
  if (!sb) return NextResponse.json({ ok: false, error: 'Service unavailable.' }, { status: 503 });

  // One account per email.
  const { data: existing } = await sb.from('brand_auth_accounts').select('id').ilike('email', String(email)).maybeSingle();
  if (existing) return NextResponse.json({ ok: false, error: 'An application already exists for this email.' }, { status: 409 });

  const { error: reqErr } = await sb.from('brand_signup_requests').insert({
    user_id: null, contact_name: contactName, company, business_address: businessAddress ?? null,
    email, website: website ?? null, phone: phone ?? null, tax_id: taxId ?? null,
    tier: tier === 'premium' ? 'premium' : 'standard', notes: notes ?? null,
  } as never);
  if (reqErr) return NextResponse.json({ ok: false, error: reqErr.message }, { status: 500 });

  const password_hash = await hashPassword(String(password));
  const { error: acctErr } = await sb.from('brand_auth_accounts').insert({ email, password_hash, status: 'pending' } as never);
  if (acctErr) return NextResponse.json({ ok: false, error: acctErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
