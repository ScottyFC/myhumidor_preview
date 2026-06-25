import { NextResponse } from 'next/server';
import { getBrandSession, svc } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await sb.from('brands').select('verified, verification_status').eq('id', s.brandId).maybeSingle();
  const row = (data ?? {}) as { verified?: boolean; verification_status?: string };
  const premium = s.brand.tier === 'premium';
  return NextResponse.json({ ok: true, tier: s.brand.tier, premium, verified: premium || !!row.verified, status: premium ? 'verified' : (row.verification_status ?? 'unverified') });
}
