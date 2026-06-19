import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripeClient, tierForPriceId } from '@/lib/stripe';
import { supabaseService } from '@/lib/supabase';

export const runtime = 'nodejs';

/** Stripe webhook: reconciles subscription state → lounge certification tier. */
export async function POST(req: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const svc = supabaseService();
  if (!stripe || !secret || !svc) return NextResponse.json({ ok: false }, { status: 200 });

  const sig = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_signature' }, { status: 400 });
  }

  try {
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const priceId = sub.items.data[0]?.price?.id ?? '';
      const active = sub.status === 'active' || sub.status === 'trialing';
      const tier = active && event.type !== 'customer.subscription.deleted' ? tierForPriceId(priceId) : 'none';
      await svc.rpc('billing_set_tier_by_customer', {
        p_customer: customer, p_tier: tier, p_subscription: sub.id,
        p_status: sub.status, p_renews_at: sub.items.data[0]?.current_period_end ? new Date(sub.items.data[0].current_period_end * 1000).toISOString() : null,
      });
    }
  } catch (e) {
    console.error('[billing webhook]', e);
  }
  return NextResponse.json({ received: true });
}
