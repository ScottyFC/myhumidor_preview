import { NextResponse } from 'next/server';
import { getBrandSession, svc } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await sb.from('broker_threads').select('id, last_message_at, lounges(name, slug)').eq('brand_id', s.brandId).order('last_message_at', { ascending: false });
  return NextResponse.json({ ok: true, threads: data ?? [] });
}
