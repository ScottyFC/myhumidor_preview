import { NextResponse } from 'next/server';
import { getOwnedLounge } from '@/lib/lounge-broker';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const lounge = await getOwnedLounge();
  if (!lounge) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const threadId = new URL(req.url).searchParams.get('threadId');
  if (!threadId) return NextResponse.json({ ok: false, error: 'Missing thread.' }, { status: 400 });
  const { data: th } = await svc.from('broker_threads').select('lounge_id').eq('id', threadId).maybeSingle();
  if (!th || (th as { lounge_id: string }).lounge_id !== lounge.loungeId) return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
  const { data } = await svc.from('broker_messages').select('id, sender_type, body, created_at').eq('thread_id', threadId).order('created_at', { ascending: true }).limit(500);
  return NextResponse.json({ ok: true, messages: data ?? [] });
}

// Post a message; if no threadId, start (or reuse) a thread with {brandId}.
export async function POST(req: Request) {
  const lounge = await getOwnedLounge();
  if (!lounge) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const body = String(b.body ?? '').trim();
  if (!body) return NextResponse.json({ ok: false, error: 'Empty message.' }, { status: 400 });
  let threadId = b.threadId as string | undefined;
  if (!threadId) {
    if (!b.brandId) return NextResponse.json({ ok: false, error: 'Missing brand.' }, { status: 400 });
    const { data: up } = await svc.from('broker_threads').upsert({ brand_id: b.brandId, lounge_id: lounge.loungeId, last_message_at: new Date().toISOString() } as never, { onConflict: 'brand_id,lounge_id' }).select('id').single();
    threadId = (up as { id: string }).id;
  } else {
    const { data: th } = await svc.from('broker_threads').select('lounge_id').eq('id', threadId).maybeSingle();
    if (!th || (th as { lounge_id: string }).lounge_id !== lounge.loungeId) return NextResponse.json({ ok: false, error: 'Not found.' }, { status: 404 });
  }
  const { error } = await svc.from('broker_messages').insert({ thread_id: threadId, sender_type: 'lounge', sender_id: lounge.userId, body } as never);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  await svc.from('broker_threads').update({ last_message_at: new Date().toISOString() } as never).eq('id', threadId);
  return NextResponse.json({ ok: true, threadId });
}
