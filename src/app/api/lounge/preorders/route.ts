import { NextResponse } from 'next/server';
import { getOwnedLounge, validateLoungeCsrf } from '@/lib/lounge-broker';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function GET() {
  const lounge = await getOwnedLounge();
  if (!lounge) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await svc.from('preorders').select('id, cigar_name, quantity, status, confirmation_number, created_at, user_id, profiles(handle, display_name)').eq('lounge_id', lounge.loungeId).order('created_at', { ascending: false }).limit(500);
  return NextResponse.json({ ok: true, preorders: data ?? [] });
}

export async function PATCH(req: Request) {
  const lounge = await getOwnedLounge();
  if (!lounge) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!validateLoungeCsrf(req)) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  if (!b.id || !['approved', 'declined', 'cancelled'].includes(b.decision)) return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  const patch: Record<string, unknown> = { status: b.decision };
  if (b.decision === 'approved') patch.approved_at = new Date().toISOString();
  const { data: po, error } = await svc.from('preorders').update(patch as never).eq('id', b.id).eq('lounge_id', lounge.loungeId).select('user_id, cigar_name, confirmation_number').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  // Notify the user.
  try {
    const r = po as { user_id: string; cigar_name: string; confirmation_number: string };
    const msg = b.decision === 'approved' ? `Your pre-order for ${r.cigar_name} is confirmed (${r.confirmation_number}).` : `Your pre-order for ${r.cigar_name} was ${b.decision}.`;
    await svc.from('notifications').insert({ user_id: r.user_id, type: 'preorder', actor_name: lounge.loungeName, entity_type: 'preorder', entity_id: '/preorders', entity_name: msg, read: false } as never);
  } catch { /* best effort */ }
  return NextResponse.json({ ok: true });
}
