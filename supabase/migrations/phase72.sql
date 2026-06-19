-- ════════════════════════════════════════════════════════════════════════════
-- Phase 72 — Invites. Admins create an invite (token + email); the link prefills
-- the email at signup, and manual invites auto-confirm the user on accept (no
-- verification email). Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.invites (
  token text primary key,
  email text not null,
  account_type text not null default 'consumer',
  skip_verification boolean not null default true,
  accepted boolean not null default false,
  accepted_by uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists invites_email_idx on public.invites(lower(email));

alter table public.invites enable row level security;

-- Admins create/list invites. Token lookups for prefill/accept go through the
-- service-role client in the API routes (which bypasses RLS), so no public read.
drop policy if exists "admins manage invites" on public.invites;
create policy "admins manage invites" on public.invites
  for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin')));
