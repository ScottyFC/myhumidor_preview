import Stripe from 'stripe';

/** Server-only Stripe client, or null if STRIPE_SECRET_KEY isn't configured. */
export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** Stripe price id per tier (set these in env once products exist). */
export function priceIdForTier(tier: string): string | null {
  switch (tier) {
    case 'starter': return process.env.STRIPE_PRICE_STARTER ?? null;
    case 'pro': return process.env.STRIPE_PRICE_PRO ?? null;
    case 'premier': return process.env.STRIPE_PRICE_PREMIER ?? null;
    default: return null;
  }
}

export function tierForPriceId(priceId: string): string {
  if (priceId === process.env.STRIPE_PRICE_PREMIER) return 'premier';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter';
  return 'none';
}
