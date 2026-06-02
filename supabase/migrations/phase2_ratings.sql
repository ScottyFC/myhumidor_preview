-- ════════════════════════════════════════════════════════════════════════════
-- Phase 2 migration — Ratings
-- Run this in the Supabase SQL Editor if you already created the schema before
-- Phase 2. It rebuilds `ratings` to match the app (references catalog_cigars,
-- stores tasting notes as an array + denormalized display fields). A fresh
-- run of schema.sql already includes this shape, so you only need this if the
-- old `ratings` table exists.
-- ════════════════════════════════════════════════════════════════════════════

drop table if exists public.tasting_notes cascade;  -- folded into ratings.tasting_notes[]
drop table if exists public.ratings cascade;        -- also drops the old aggregate trigger

create table public.ratings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cigar_id uuid not null references public.catalog_cigars(id) on delete cascade,
  flavor_score int not null check (flavor_score between 1 and 5),
  burn_score int not null check (burn_score between 1 and 5),
  appearance_score int not null check (appearance_score between 1 and 5),
  overall numeric(3,2) not null,
  notes text,
  tasting_notes text[] not null default '{}',
  brand text,
  name text,
  size text,
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cigar_id)
);
create index ratings_cigar_idx on public.ratings(cigar_id);
create index ratings_user_idx on public.ratings(user_id);

alter table public.ratings enable row level security;
create policy "ratings are public" on public.ratings for select using (true);
create policy "users manage own ratings" on public.ratings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant all on public.ratings to anon, authenticated, service_role;
