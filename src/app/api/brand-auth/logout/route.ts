import { NextResponse } from 'next/server';
import { destroyBrandSession, sessionCookieOptions } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function POST() {
  await destroyBrandSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...sessionCookieOptions(0), value: '' });
  return res;
}
