import { NextResponse } from 'next/server';
import { getOwnedLounge, validateLoungeCsrf } from '@/lib/lounge-broker';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const lounge = await getOwnedLounge();
  if (!lounge) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!validateLoungeCsrf(req)) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const code = String(b.code ?? '').trim();          // confirmation number
  const token = String(b.token ?? '').trim();        // qr token (uuid)
  if (!code && !token) return NextResponse.json({ ok: false, error: 'Scan or enter a confirmation code.' }, { status: 400 });

  let q = svc.from('preorders').select('id, cigar_name, status, confirmation_number, profiles(handle, display_name)').eq('lounge_id', lounge.loungeId);
  q = token ? q.eq('qr_token', token) : q.eq('confirmation_number', code.toUpperCase());
  const { data: po } = await q.maybeSingle();
  const r = po as { id: string; cigar_name: string; status: string; confirmation_number: string; profiles?: { handle: string; display_name: string } } | null;
  if (!r) return NextResponse.json({ ok: false, error: 'No matching pre-order at your lounge.' }, { status: 404 });
  if (r.status === 'fulfilled') return NextResponse.json({ ok: false, error: 'Already picked up.' }, { status: 409 });
  if (r.status !== 'approved') return NextResponse.json({ ok: false, error: `This pre-order is ${r.status}, not approved for pickup.` }, { status: 409 });

  const { error } = await svc.from('preorders').update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() } as never).eq('id', r.id).eq('lounge_id', lounge.loungeId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, cigarName: r.cigar_name, code: r.confirmation_number, customer: r.profiles?.display_name || r.profiles?.handle || 'Customer' });
}
