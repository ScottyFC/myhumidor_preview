import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await sb.from('brand_notifications').select('id, kind, title, body, href, read, created_at').eq('brand_id', s.brandId).order('created_at', { ascending: false }).limit(50);
  const items = data ?? [];
  return NextResponse.json({ ok: true, items, unread: (items as { read: boolean }[]).filter((n) => !n.read).length });
}
export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  await sb.from('brand_notifications').update({ read: true } as never).eq('brand_id', s.brandId).eq('read', false);
  return NextResponse.json({ ok: true });
}
