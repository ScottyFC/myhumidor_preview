-- ════════════════════════════════════════════════════════════════════════════
-- Phase 5/6 migration
-- Run once in the Supabase SQL Editor.
--  • catalog_cigars: created_at (for "recently added") + admins can insert
--    (approved submissions become real, searchable cigars)
--  • profiles: created_at (for "recently joined") + super admins can update
--    roles (promote) and any profile
--  • lounges: `certified` flag (super-admin badge) + admins can insert/update
--  • lounge_submissions: user-submitted lounges, admin-reviewed
-- ════════════════════════════════════════════════════════════════════════════

-- ── catalog_cigars ──────────────────────────────────────────────────────────
alter table public.catalog_cigars add column if not exists created_at timestamptz not null default now();
create index if not exists catalog_recent_idx on public.catalog_cigars(created_at desc);

drop policy if exists "admins add cigars" on public.catalog_cigars;
create policy "admins add cigars" on public.catalog_cigars
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

-- ── profiles ────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists created_at timestamptz not null default now();
create index if not exists profiles_recent_idx on public.profiles(created_at desc);

drop policy if exists "super admins manage profiles" on public.profiles;
create policy "super admins manage profiles" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

-- ── lounges ─────────────────────────────────────────────────────────────────
alter table public.lounges add column if not exists certified boolean not null default false;
-- user-submitted lounges may have no coordinates until geocoded
alter table public.lounges alter column lat drop not null;
alter table public.lounges alter column lng drop not null;

drop policy if exists "admins add lounges" on public.lounges;
create policy "admins add lounges" on public.lounges
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

drop policy if exists "admins update lounges" on public.lounges;
create policy "admins update lounges" on public.lounges
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

-- ── lounge_submissions ──────────────────────────────────────────────────────
create table if not exists public.lounge_submissions (
  id uuid primary key default uuid_generate_v4(),
  submitted_by uuid references public.profiles(id) on delete set null,
  name text not null,
  address text,
  city text,
  state text,
  phone text,
  email text,
  website text,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.lounge_submissions enable row level security;

drop policy if exists "users submit lounges" on public.lounge_submissions;
create policy "users submit lounges" on public.lounge_submissions
  for insert with check (auth.uid() = submitted_by);

drop policy if exists "users see own lounge submissions" on public.lounge_submissions;
create policy "users see own lounge submissions" on public.lounge_submissions
  for select using (auth.uid() = submitted_by);

drop policy if exists "admins review lounge submissions" on public.lounge_submissions;
create policy "admins review lounge submissions" on public.lounge_submissions
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

grant all on public.lounge_submissions to anon, authenticated, service_role;
