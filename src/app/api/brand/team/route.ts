import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getBrandSession, svc, validateCsrf, hashPassword, createPasswordReset, sendBrandEmail, getAccountByEmail, emailProviderConfigured } from '@/lib/brand-auth';

export const runtime = 'nodejs';

export async function GET() {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const sb = svc(); if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { data: members } = await sb.from('brand_auth_accounts').select('id, email, status, email_verified').eq('brand_id', s.brandId).order('created_at', { ascending: true });
  const { data: sub } = await sb.from('brand_subscriptions').select('seats').eq('brand_id', s.brandId).maybeSingle();
  return NextResponse.json({
    ok: true,
    seats: (sub as { seats: number } | null)?.seats ?? 2,
    self: s.accountId,
    members: (members ?? []).map((m: Record<string, unknown>) => ({ id: m.id, email: m.email, status: m.status, emailVerified: !!m.email_verified })),
  });
}

export async function POST(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc(); if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const { email } = await req.json().catch(() => ({}));
  if (!email || !String(email).includes('@')) return NextResponse.json({ ok: false, error: 'Enter a valid email.' }, { status: 400 });

  const { count } = await sb.from('brand_auth_accounts').select('id', { count: 'exact', head: true }).eq('brand_id', s.brandId);
  const { data: sub } = await sb.from('brand_subscriptions').select('seats').eq('brand_id', s.brandId).maybeSingle();
  const seats = (sub as { seats: number } | null)?.seats ?? 2;
  if ((count ?? 0) >= seats) return NextResponse.json({ ok: false, error: `You’ve used all ${seats} seats on your plan.` }, { status: 400 });
  if (await getAccountByEmail(String(email))) return NextResponse.json({ ok: false, error: 'That email already has an account.' }, { status: 409 });

  // Create the seat (active + verified), then email a set-password link.
  const password_hash = await hashPassword(randomBytes(24).toString('hex'));
  const { data: acct, error } = await sb.from('brand_auth_accounts').insert({ email, password_hash, status: 'active', email_verified: true, brand_id: s.brandId } as never).select('id').single();
  if (error || !acct) return NextResponse.json({ ok: false, error: error?.message ?? 'Could not add seat.' }, { status: 500 });

  let emailed = false;
  if (emailProviderConfigured()) {
    const token = await createPasswordReset((acct as { id: string }).id);
    if (token) emailed = await sendBrandEmail(String(email), `You’ve been added to ${s.brand.name} on MyHumidor`,
      `<p>You’ve been given access to the ${s.brand.name} brand portal on MyHumidor.</p><p>Set your password to sign in (link valid 1 hour):</p><p><a href="${new URL(req.url).origin}/brand/reset?token=${token}">Set your password</a></p>`);
  }
  return NextResponse.json({ ok: true, emailed });
}

export async function DELETE(req: Request) {
  const s = await getBrandSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!(await validateCsrf(req))) return NextResponse.json({ ok: false, error: 'Invalid request token.' }, { status: 403 });
  const sb = svc(); if (!sb) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id.' }, { status: 400 });
  if (id === s.accountId) return NextResponse.json({ ok: false, error: 'You can’t remove your own access.' }, { status: 400 });
  const { error } = await sb.from('brand_auth_accounts').delete().eq('id', id).eq('brand_id', s.brandId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
