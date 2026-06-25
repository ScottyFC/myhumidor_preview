import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

async function requireAdmin() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const { data } = await (sb as unknown as SupabaseClient).rpc('_is_admin');
  return data === true;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await svc.from('brand_tax_submissions').select('brand_id, legal_name, ein, business_type, address, contact_email, status, created_at, brands(name, slug)').eq('status', 'pending').order('created_at', { ascending: true });
  return NextResponse.json({ ok: true, submissions: data ?? [] });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  if (!b.brandId || !['verified', 'rejected'].includes(b.decision)) return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  const verified = b.decision === 'verified';
  await svc.from('brand_tax_submissions').update({ status: b.decision, reviewed_at: new Date().toISOString() } as never).eq('brand_id', b.brandId);
  await svc.from('brands').update({ verified, verification_status: b.decision } as never).eq('id', b.brandId);
  return NextResponse.json({ ok: true });
}
