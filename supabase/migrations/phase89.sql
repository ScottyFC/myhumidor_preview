-- Phase 89 — Email verification for brand signup.
alter table public.brand_auth_accounts add column if not exists email_verified boolean not null default false;

create table if not exists public.brand_email_verifications (
  token_hash text primary key,
  account_id uuid not null references public.brand_auth_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.brand_email_verifications enable row level security;  -- service-role only
