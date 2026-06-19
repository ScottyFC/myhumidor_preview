import { NextResponse } from 'next/server';
import { stripeClient, priceIdForTier } from '@/lib/stripe';
import { supabaseService, supabaseServer } from '@/lib/supabase';

/** POST { loungeSlug, tier } → Stripe Checkout url, or { fallback:true } when
 *  Stripe isn't configured so the client applies the tier change for free. */
export async function POST(req: Request) {
  const stripe = stripeClient();
  if (!stripe) return NextResponse.json({ fallback: true });

  const { loungeSlug, tier } = await req.json().catch(() => ({}));
  const price = priceIdForTier(tier);
  if (!loungeSlug || !price) return NextResponse.json({ fallback: true });

  // Must be the signed-in owner of this lounge.
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const uid = auth?.user?.id;
  const svc = supabaseService();
  if (!uid || !svc) return NextResponse.json({ error: 'auth' }, { status: 200 });

  const { data: lounge } = await svc.from('lounges').select('id, name, owner_id, stripe_customer_id').eq('slug', loungeSlug).maybeSingle();
  if (!lounge || lounge.owner_id !== uid) return NextResponse.json({ error: 'not_owner' }, { status: 200 });

  let customerId = lounge.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ name: lounge.name, email: auth?.user?.email ?? undefined, metadata: { lounge_slug: loungeSlug } });
    customerId = customer.id;
    await svc.from('lounges').update({ stripe_customer_id: customerId }).eq('id', lounge.id);
  }

  const origin = new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/dashboard/plan?status=success`,
    cancel_url: `${origin}/dashboard/plan?status=cancel`,
    metadata: { lounge_slug: loungeSlug, tier },
  });
  return NextResponse.json({ url: session.url });
}
