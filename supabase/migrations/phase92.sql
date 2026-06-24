-- Phase 92 — Brand billing/invoices, support tickets, review-request workflow, premium activation.

-- 1) Normalize review-request status to the workflow Scotty wants + capture email.
alter table public.brand_review_requests drop constraint if exists brand_review_requests_status_check;
alter table public.brand_review_requests add column if not exists email text;
update public.brand_review_requests set status = 'awaiting'
  where status is null or status not in ('awaiting','in_progress','done');
alter table public.brand_review_requests alter column status set default 'awaiting';
alter table public.brand_review_requests add constraint brand_review_requests_status_check
  check (status in ('awaiting','in_progress','done'));

-- 2) Support tickets.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  email text,
  subject text not null,
  body text not null,
  priority boolean not null default false,           -- premium = true (sorts to top)
  status text not null default 'awaiting' check (status in ('awaiting','in_progress','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;

-- 3) Invoices / billing record.
create table if not exists public.brand_invoices (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  amount_cents int not null,
  currency text not null default 'usd',
  description text,
  period text,                                       -- e.g. '2026-06' or 'Service contract'
  status text not null default 'draft' check (status in ('draft','sent','paid','void')),
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.brand_invoices enable row level security;

-- Optional payment-method note on the subscription (admin-maintained record).
alter table public.brand_subscriptions add column if not exists payment_method text;
alter table public.brand_subscriptions add column if not exists contract_amount_cents int;

-- 4) Admin RLS (browser admin client reads/updates these; brands write via service role).
do $$ begin
  -- support_tickets
  drop policy if exists support_admin_all on public.support_tickets;
  create policy support_admin_all on public.support_tickets for all
    using (public._is_admin()) with check (public._is_admin());
  -- brand_invoices
  drop policy if exists invoices_admin_all on public.brand_invoices;
  create policy invoices_admin_all on public.brand_invoices for all
    using (public._is_admin()) with check (public._is_admin());
  -- brand_review_requests admin manage
  drop policy if exists review_admin_all on public.brand_review_requests;
  create policy review_admin_all on public.brand_review_requests for all
    using (public._is_admin()) with check (public._is_admin());
end $$;

-- 5) Admin helpers.
create or replace function public.set_brand_subscription_status(p_brand_id uuid, p_status text, p_amount_cents int default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  update public.brand_subscriptions
    set status = p_status,
        contract_amount_cents = coalesce(p_amount_cents, contract_amount_cents)
  where brand_id = p_brand_id;
end $$;
grant execute on function public.set_brand_subscription_status(uuid, text, int) to authenticated;

create or replace function public.set_brand_payment_method(p_brand_id uuid, p_method text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  update public.brand_subscriptions set payment_method = p_method where brand_id = p_brand_id;
end $$;
grant execute on function public.set_brand_payment_method(uuid, text) to authenticated;

-- Admin can read/manage all subscriptions (for the Brands billing view).
do $$ begin
  drop policy if exists subs_admin_all on public.brand_subscriptions;
  create policy subs_admin_all on public.brand_subscriptions for all
    using (public._is_admin()) with check (public._is_admin());
end $$;
