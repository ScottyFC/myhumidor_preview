-- ════════════════════════════════════════════════════════════════════════════
-- Phase 73 — Billing columns on lounges + a service-side tier setter the Stripe
-- webhook uses to reconcile a paid subscription to a certification tier.
-- The plan UI works without Stripe (free tier change); these power real billing
-- once Stripe keys + price IDs + a webhook are configured. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.lounges add column if not exists stripe_customer_id text;
alter table public.lounges add column if not exists stripe_subscription_id text;
alter table public.lounges add column if not exists plan_status text;          -- active | past_due | canceled | trialing
alter table public.lounges add column if not exists plan_renews_at timestamptz;

-- Reconcile a tier from the webhook (service role only — bypasses RLS).
-- Mirrors set_cert_tier but keyed by stripe_customer_id and callable by the
-- service client. Sets certified = (tier <> 'none').
create or replace function public.billing_set_tier_by_customer(
  p_customer text, p_tier text, p_subscription text default null,
  p_status text default null, p_renews_at timestamptz default null
) returns void language sql security definer set search_path = public as $$
  update public.lounges set
    cert_tier = p_tier,
    certified = (p_tier <> 'none'),
    stripe_subscription_id = coalesce(p_subscription, stripe_subscription_id),
    plan_status = coalesce(p_status, plan_status),
    plan_renews_at = coalesce(p_renews_at, plan_renews_at)
  where stripe_customer_id = p_customer;
$$;
