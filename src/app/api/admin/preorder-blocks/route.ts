import { NextResponse } from 'next/server';
import { supabaseServer, supabaseService } from '@/lib/supabase';
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
  const { data } = await svc.from('profiles').select('id, handle, display_name, preorder_cancel_count').eq('preorder_blocked', true).order('preorder_cancel_count', { ascending: false }).limit(200);
  // count active/historical pre-orders per blocked user for context
  const rows = (data ?? []) as { id: string }[];
  const out = [] as Record<string, unknown>[];
  for (const r of rows) {
    const { count: total } = await svc.from('preorders').select('*', { count: 'exact', head: true }).eq('user_id', r.id);
    const { count: cancelled } = await svc.from('preorders').select('*', { count: 'exact', head: true }).eq('user_id', r.id).eq('status', 'cancelled');
    out.push({ ...r, total: total ?? 0, cancelled: cancelled ?? 0 });
  }
  return NextResponse.json({ ok: true, users: out });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  if (!b.userId) return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  // Reinstate: clear the block and reset the counter.
  const { error } = await svc.from('profiles').update({ preorder_blocked: false, preorder_cancel_count: 0 } as never).eq('id', b.userId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
