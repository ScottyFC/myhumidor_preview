import { NextResponse } from 'next/server';
import { getBrandSession } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function GET() {
  const s = await getBrandSession();
  return NextResponse.json({ brand: s?.brand ?? null });
}
