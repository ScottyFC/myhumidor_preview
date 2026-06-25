-- Phase 98 — Broker hardening: brand verification (Premier auto-verified, Standard
-- verifies via tax info), brand notifications, and rate-limit usage on broker actions.

-- Brand verification. Premium ("Premier") brands are treated as verified by tier;
-- this column is the gate for Standard brands once they submit tax info.
alter table public.brands add column if not exists verified boolean not null default false;
alter table public.brands add column if not exists verification_status text not null default 'unverified'
  check (verification_status in ('unverified','pending','verified','rejected'));
update public.brands set verified = true, verification_status = 'verified' where tier = 'premium';

-- Tax / business info submitted by Standard brands for verification. SENSITIVE:
-- RLS-locked, no client policies — only service-role server routes touch it. We
-- intentionally store the EIN (business tax id), legal name, and business address,
-- never an SSN. Treat as confidential.
create table if not exists public.brand_tax_submissions (
  brand_id uuid primary key references public.brands(id) on delete cascade,
  legal_name text not null,
  ein text not null,                 -- business EIN, e.g. 12-3456789
  business_type text,
  address text,
  contact_email text,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.brand_tax_submissions enable row level security; -- service-role only

-- In-app notifications for brands (brands use custom auth, so they don't have the
-- consumer notification bell — this backs an unread badge + list in the dashboard).
create table if not exists public.brand_notifications (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists bn_brand_idx on public.brand_notifications(brand_id, read, created_at);
alter table public.brand_notifications enable row level security; -- service-role only
