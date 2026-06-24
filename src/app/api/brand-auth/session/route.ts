import { NextResponse } from 'next/server';
import { getBrandSession, getAccountMfa } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ brand: null });
  const mfa = await getAccountMfa(s.accountId);
  return NextResponse.json({ brand: s.brand, email: s.email, mfaEnabled: !!mfa?.enabled });
}
