export type Tier = 'starter' | 'pro' | 'premier';

export interface PlanTier {
  id: Tier; name: string; price: string; monthly: number; blurb: string; features: string[];
}

export const PLAN_TIERS: PlanTier[] = [
  { id: 'starter', name: 'Starter', price: '$49/mo', monthly: 49, blurb: 'Get certified and on the map.',
    features: ['Certified badge on your shop page', 'Digital menu for in-lounge screens', 'Post updates, promos & events', 'Customer check-in feed'] },
  { id: 'pro', name: 'Pro', price: '$99/mo', monthly: 99, blurb: 'Grow the room with promotion tools.',
    features: ['Everything in Starter', 'Boosted posts at member rates', 'Viewership & credit analytics', 'Priority listing in your city'] },
  { id: 'premier', name: 'Premier', price: '$199/mo', monthly: 199, blurb: 'Maximum reach across MyHumidor.',
    features: ['Everything in Pro', 'Featured placement across MyHumidor', 'CigarTV ad-overlay slots on the live feed', 'Dedicated partner support'] },
];

/** Start checkout for a tier. Returns a Stripe URL to redirect to, or
 *  { fallback: true } when Stripe isn't configured (caller applies the tier
 *  change directly — the free in-app path). */
export async function startCheckout(loungeSlug: string, tier: Tier): Promise<{ url?: string; fallback?: boolean; error?: string }> {
  try {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loungeSlug, tier }),
    });
    return await res.json();
  } catch { return { fallback: true }; }
}

/** Open the Stripe billing portal (manage card / invoices / cancel). */
export async function openBillingPortal(loungeSlug: string): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch('/api/billing/portal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loungeSlug }),
    });
    return await res.json();
  } catch { return { error: 'failed' }; }
}
