import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

/** GET /api/invite/{token} → { valid, email, accountType, skipVerification }.
 *  Uses the service client (token is the secret; no public RLS read). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const svc = supabaseService();
  if (!svc) return NextResponse.json({ valid: false }, { status: 200 });
  const { data } = await svc.from('invites').select('email, account_type, skip_verification, accepted, expires_at').eq('token', token).maybeSingle();
  if (!data || data.accepted || new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false });
  }
  return NextResponse.json({ valid: true, email: data.email, accountType: data.account_type, skipVerification: data.skip_verification });
}
