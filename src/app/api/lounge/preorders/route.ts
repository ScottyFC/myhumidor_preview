import { NextResponse } from 'next/server';
import { getOwnedLounge, validateLoungeCsrf } from '@/lib/lounge-broker';
import { sendBrandEmail } from '@/lib/brand-auth';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function GET() {
  const lounge = await getOwnedLounge();
  if (!lounge) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const svc = supabaseService() as unknown as SupabaseClient | null;
  if (!svc) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data } = await svc.from('preorders').select('id, cigar_name, quantity, status, confirmation_number, created_at, user_id').eq('lounge_id', lounge.loungeId).order('created_at', { ascending: false }).limit(500);
  const rows = (data ?? []) as { user_id: string }[];
  // preorders.user_id -> auth.users (no direct FK to profiles), so look profiles up separately.
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const byId = new Map<string, { handle: string; display_name: string }>();
  if (ids.length) {
    const { data: profs } = await svc.from('profiles').select('id, handle, display_name').in('id', ids);
    for (const p of ((profs ?? []) as Record<string, unknown>[])) byId.set(p.id as string, { handle: (p.handle as string) ?? '', display_name: (p.display_name as string) ?? '' });
  }
  const preorders = rows.map((r) => ({ ...r, profiles: byId.get(r.user_id) ?? null }));
  return NextResponse.json({ ok: true, preorders });
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
    // In-app / push-surfaced notification (shows in the web + app notification bell).
    await svc.from('notifications').insert({ user_id: r.user_id, type: 'preorder', actor_name: lounge.loungeName, entity_type: 'preorder', entity_id: '/preorders', entity_name: msg, read: false } as never);
    // On approval, also email the customer a link to their QR code.
    if (b.decision === 'approved') {
      const { data: u } = await svc.auth.admin.getUserById(r.user_id);
      const email = u?.user?.email;
      if (email) {
        const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myhumidor.shop';
        await sendBrandEmail(email, `Your pre-order is confirmed — ${r.cigar_name}`,
          `<p><strong>${lounge.loungeName}</strong> confirmed your pre-order for <strong>${r.cigar_name}</strong>.</p>
           <p>Confirmation number: <strong>${r.confirmation_number}</strong></p>
           <p>Show your QR code at the lounge to pick it up:</p>
           <p><a href="${base}/preorders" style="display:inline-block;background:#f0c355;color:#14110d;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">View my QR code</a></p>`);
      }
    }
  } catch { /* best effort */ }
  return NextResponse.json({ ok: true });
}
