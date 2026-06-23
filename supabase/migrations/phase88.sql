-- Phase 88 — Auth hardening: shared rate-limiter + brand password resets.

-- DB-backed rate limiter (works across serverless instances, unlike in-memory).
create table if not exists public.auth_rate_limits (
  key text primary key,            -- e.g. 'brandlogin:ip:1.2.3.4' or 'brandlogin:email:x@y.com'
  count int not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz
);
alter table public.auth_rate_limits enable row level security;  -- service-role only

-- One-time brand password-reset tokens (hashed at rest).
create table if not exists public.brand_password_resets (
  token_hash text primary key,
  account_id uuid not null references public.brand_auth_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.brand_password_resets enable row level security;  -- service-role only
