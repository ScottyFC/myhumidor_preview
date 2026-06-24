import { NextResponse } from 'next/server';
import { consumeEmailVerification } from '@/lib/brand-auth';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({}));
  const lim = await checkRateLimit(`brandverify:ip:${clientIp(req)}`, { max: 30, windowSec: 3600, lockSec: 3600 });
  if (!lim.allowed) return NextResponse.json({ ok: false, error: 'Too many attempts. Try again later.' }, { status: 429 });
  if (!token) return NextResponse.json({ ok: false, error: 'Missing token.' }, { status: 400 });
  const ok = await consumeEmailVerification(String(token));
  if (!ok) return NextResponse.json({ ok: false, error: 'This verification link is invalid or expired.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
