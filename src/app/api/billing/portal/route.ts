import { NextResponse } from 'next/server';
import { stripeClient } from '@/lib/stripe';
import { supabaseService, supabaseServer } from '@/lib/supabase';

/** POST { loungeSlug } → Stripe billing portal url (manage card / invoices). */
export async function POST(req: Request) {
  const stripe = stripeClient();
  if (!stripe) return NextResponse.json({ error: 'not_configured' });

  const { loungeSlug } = await req.json().catch(() => ({}));
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const uid = auth?.user?.id;
  const svc = supabaseService();
  if (!uid || !svc) return NextResponse.json({ error: 'auth' });

  const { data: lounge } = await svc.from('lounges').select('owner_id, stripe_customer_id').eq('slug', loungeSlug).maybeSingle();
  if (!lounge || lounge.owner_id !== uid || !lounge.stripe_customer_id) return NextResponse.json({ error: 'no_customer' });

  const origin = new URL(req.url).origin;
  const session = await stripe.billingPortal.sessions.create({ customer: lounge.stripe_customer_id, return_url: `${origin}/dashboard/plan` });
  return NextResponse.json({ url: session.url });
}
