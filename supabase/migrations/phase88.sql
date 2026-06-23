-- Phase 88 — Auth hardening: shared rate-limiter + brand password resets.
-- Self-sufficient: ensures the brand-auth tables exist (in case phase87 hasn't run yet),
-- so this can be applied independently. Fully idempotent.

-- Dependency safety net (same as phase87; no-ops if already created there).
create table if not exists public.brand_auth_accounts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  email text not null,
  password_hash text not null,
  status text not null default 'pending' check (status in ('pending','active','disabled')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index if not exists brand_auth_email_key on public.brand_auth_accounts (lower(email));
alter table public.brand_auth_accounts enable row level security;

create table if not exists public.brand_auth_sessions (
  token text primary key,
  account_id uuid not null references public.brand_auth_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.brand_auth_sessions enable row level security;

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
