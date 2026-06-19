import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

/** POST /api/invite/accept { token, userId } → confirms the user's email (manual
 *  invites skip verification) and marks the invite accepted. Validates the token
 *  matches the user's email so it can't be used to confirm an arbitrary account. */
export async function POST(req: Request) {
  const svc = supabaseService();
  if (!svc) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 200 });
  let token = '', userId = '';
  try { const b = await req.json(); token = b.token ?? ''; userId = b.userId ?? ''; } catch { /* ignore */ }
  if (!token || !userId) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 200 });

  const { data: inv } = await svc.from('invites').select('email, skip_verification, accepted, expires_at').eq('token', token).maybeSingle();
  if (!inv || inv.accepted || new Date(inv.expires_at) < new Date()) return NextResponse.json({ ok: false, error: 'invalid_invite' });

  // The invite must belong to this user's email.
  const { data: u } = await svc.auth.admin.getUserById(userId);
  const email = u?.user?.email?.toLowerCase();
  if (!email || email !== inv.email.toLowerCase()) return NextResponse.json({ ok: false, error: 'email_mismatch' });

  if (inv.skip_verification) {
    await svc.auth.admin.updateUserById(userId, { email_confirm: true });
  }
  await svc.from('invites').update({ accepted: true, accepted_by: userId }).eq('token', token);
  return NextResponse.json({ ok: true, confirmed: !!inv.skip_verification });
}
