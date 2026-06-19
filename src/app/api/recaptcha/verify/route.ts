import { NextResponse } from 'next/server';

/** POST { token } → verifies a reCAPTCHA token with Google using the server-side
 *  secret. If the secret isn't configured, it doesn't block signups. */
export async function POST(req: Request) {
  const secret = process.env.SECRET_reCAPTCHA_KEY;
  if (!secret) return NextResponse.json({ ok: true, skipped: true });

  const { token } = await req.json().catch(() => ({ token: '' }));
  if (!token) return NextResponse.json({ ok: false, error: 'missing_token' });

  try {
    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    const data = await res.json();
    return NextResponse.json({ ok: !!data.success });
  } catch {
    return NextResponse.json({ ok: false, error: 'verify_failed' });
  }
}
