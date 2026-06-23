import { NextResponse } from 'next/server';
import { verifyPassword, verifyRecaptcha, createBrandSession, sessionCookieOptions, svc } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  const { email, password, recaptchaToken } = b;

  if (!(await verifyRecaptcha(recaptchaToken))) return NextResponse.json({ ok: false, error: 'Captcha failed. Please try again.' }, { status: 400 });
  if (!email || !password) return NextResponse.json({ ok: false, error: 'Enter your email and password.' }, { status: 400 });

  const sb = svc();
  if (!sb) return NextResponse.json({ ok: false, error: 'Service unavailable.' }, { status: 503 });

  const { data } = await sb.from('brand_auth_accounts').select('id, password_hash, status, brand_id').ilike('email', String(email)).maybeSingle();
  const a = data as { id: string; password_hash: string; status: string; brand_id: string | null } | null;
  // Always run a compare to reduce timing leakage on unknown emails.
  const ok = a ? await verifyPassword(String(password), a.password_hash) : await verifyPassword(String(password), '$2a$12$0000000000000000000000000000000000000000000000000000');
  if (!a || !ok) return NextResponse.json({ ok: false, error: 'Invalid email or password.' }, { status: 401 });
  if (a.status === 'pending') return NextResponse.json({ ok: false, error: 'Your application is still pending approval.' }, { status: 403 });
  if (a.status !== 'active' || !a.brand_id) return NextResponse.json({ ok: false, error: 'This account isn’t active. Contact MyHumidor.' }, { status: 403 });

  const token = await createBrandSession(a.id);
  if (!token) return NextResponse.json({ ok: false, error: 'Could not start a session.' }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...sessionCookieOptions(), value: token });
  return res;
}
