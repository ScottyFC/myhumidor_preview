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
  const type = searchParams.get('type'); // 'consumer' | 'retailer'

  if (!isSupabaseConfigured || !code) {
    return NextResponse.redirect(`${origin}/register`);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/register?error=auth`);
  }

  // First-time social signup: persist the chosen account type.
  const current = data.user.user_metadata?.account_type;
  if (type && current !== type) {
    await supabase.auth.updateUser({ data: { account_type: type } });
    await supabase
      .from('profiles')
      .update({
        account_type: type,
        role: (type === 'retailer' || type === 'lounge') ? 'lounge_owner' : 'consumer',
      })
      .eq('id', data.user.id);
  }

  // After confirming their email, retailers continue to plans/certification;
  // members land on the home page.
  const dest = (type === 'retailer' || type === 'lounge') ? '/verify' : '/';
  return NextResponse.redirect(`${origin}${dest}`);
}
