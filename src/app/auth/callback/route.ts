import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';

/**
 * OAuth / email-confirmation callback. Supabase redirects here with a `code`
 * we exchange for a session, plus the chosen account `type`. If the user picked
 * "lounge" (social signups can't carry metadata pre-auth), we stamp it now.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const otpType = searchParams.get('type') as 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink' | null;
  const type = searchParams.get('type'); // also used as account type ('consumer'|'retailer')

  if (!isSupabaseConfigured || (!code && !tokenHash)) {
    return NextResponse.redirect(`${origin}/register`);
  }

  const supabase = await supabaseServer();

  // Email-confirmation links use token_hash; OAuth/PKCE uses code. Handle both so
  // the user is always signed in after clicking the confirmation link.
  let userId: string | undefined;
  let userMeta: Record<string, unknown> | undefined;
  if (tokenHash && (otpType === 'signup' || otpType === 'email' || otpType === 'invite' || otpType === 'magiclink' || otpType === 'recovery')) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (error || !data.user) return NextResponse.redirect(`${origin}/register?error=auth`);
    userId = data.user.id; userMeta = data.user.user_metadata ?? undefined;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return NextResponse.redirect(`${origin}/register?error=auth`);
    userId = data.user.id; userMeta = data.user.user_metadata ?? undefined;
  }
  if (!userId) return NextResponse.redirect(`${origin}/register?error=auth`);

  const acctType = (userMeta?.account_type as string) || type;
  const isLounge = acctType === 'retailer' || acctType === 'lounge';

  // First-time social signup: persist the chosen account type.
  if (type && userMeta?.account_type !== type) {
    await supabase.auth.updateUser({ data: { account_type: type } });
    await supabase
      .from('profiles')
      .update({ account_type: type, role: isLounge ? 'lounge_owner' : 'consumer' })
      .eq('id', userId);
  }

  // Retailers continue to verification (now signed in); members land home.
  return NextResponse.redirect(`${origin}${isLounge ? '/verify' : '/'}`);
}
