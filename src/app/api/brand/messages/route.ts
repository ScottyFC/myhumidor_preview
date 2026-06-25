import { NextResponse } from 'next/server';
import { getBrandSession, svc, validateCsrf } from '@/lib/brand-auth';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

async function ownsThread(sb: SupabaseClient, threadId: string, brandId: string) {
  const { data } = await sb.from('broker_threads').select('brand_id').eq('id', threadId).maybeSingle();
  return !!data && (data as { brand_id: string }).brand_id === brandId;
}

export async function GET(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const threadId = new URL(req.url).searchParams.get('threadId');
  if (!threadId || !(await ownsThread(sb, threadId, s.brandId))) return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
  const { data } = await sb.from('broker_messages').select('id, sender_type, body, created_at').eq('thread_id', threadId).order('created_at', { ascending: true }).limit(500);
  return NextResponse.json({ ok: true, messages: data ?? [] });
}

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc() as unknown as SupabaseClient | null;
  if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const body = String(b.body ?? '').trim();
  if (!b.threadId || !body || !(await ownsThread(sb, b.threadId, s.brandId))) return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  const { error } = await sb.from('broker_messages').insert({ thread_id: b.threadId, sender_type: 'brand', sender_id: s.brandId, body } as never);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await sb.from('broker_threads').update({ last_message_at: new Date().toISOString() } as never).eq('id', b.threadId);
  return NextResponse.json({ ok: true });
}
