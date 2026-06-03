-- ════════════════════════════════════════════════════════════════════════════
-- Phase 7 migration — run once in the SQL Editor.
--  • change_requests table (crowd-sourced corrections → admin queue)
--  • inventory_items repointed to catalog_cigars + denormalized + published flag
--  • idempotency guards: cigar_submissions.catalog_id, lounge_submissions.lounge_id
--  • super admins can delete catalog cigars
--  • rating views for "Top this week" + "Highest rated"
--  • realtime on the review queues so all admins stay in sync
-- ════════════════════════════════════════════════════════════════════════════

-- ── change_requests ─────────────────────────────────────────────────────────
create table if not exists public.change_requests (
  id uuid primary key default uuid_generate_v4(),
  submitted_by uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('cigar','lounge')),
  target_id text not null,
  target_name text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.change_requests enable row level security;

drop policy if exists "anyone submits change requests" on public.change_requests;
create policy "anyone submits change requests" on public.change_requests
  for insert with check (true);

drop policy if exists "users see own change requests" on public.change_requests;
create policy "users see own change requests" on public.change_requests
  for select using (auth.uid() = submitted_by);

drop policy if exists "admins manage change requests" on public.change_requests;
create policy "admins manage change requests" on public.change_requests
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

grant all on public.change_requests to anon, authenticated, service_role;

-- ── idempotency guards (no duplicate catalog/lounge rows across admins) ──────
alter table public.cigar_submissions add column if not exists catalog_id uuid;
alter table public.lounge_submissions add column if not exists lounge_id uuid;

-- ── super admins can delete catalog cigars ──────────────────────────────────
drop policy if exists "admins delete cigars" on public.catalog_cigars;
create policy "admins delete cigars" on public.catalog_cigars
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

-- ── inventory_items: repoint to catalog_cigars + denormalize + publish flag ──
alter table public.inventory_items drop constraint if exists inventory_items_cigar_id_fkey;
alter table public.inventory_items add column if not exists brand text;
alter table public.inventory_items add column if not exists name text;
alter table public.inventory_items add column if not exists slug text;
alter table public.inventory_items add column if not exists size text;
alter table public.inventory_items add column if not exists quantity int not null default 1;
alter table public.inventory_items add column if not exists published boolean not null default false;

drop policy if exists "published menus are public" on public.inventory_items;
create policy "published menus are public" on public.inventory_items
  for select using (published = true);

-- Dev-stage: any signed-in user can manage inventory (lounge↔owner mapping is a
-- later hardening). Tighten to owner/admin once lounges have an owner_id.
drop policy if exists "authenticated manage inventory" on public.inventory_items;
create policy "authenticated manage inventory" on public.inventory_items
  for all using (auth.role() = 'authenticated');

grant all on public.inventory_items to anon, authenticated, service_role;

-- ── rating views ────────────────────────────────────────────────────────────
create or replace view public.cigar_rating_stats as
  select c.id as cigar_id, c.slug, c.brand, c.name, c.size, c.image_url,
         round(avg(r.overall)::numeric, 2) as avg_overall,
         count(*)::int as ratings_count,
         max(r.created_at) as last_rated
  from public.ratings r
  join public.catalog_cigars c on c.id = r.cigar_id
  group by c.id, c.slug, c.brand, c.name, c.size, c.image_url;

create or replace view public.cigar_rating_week as
  select c.id as cigar_id, c.slug, c.brand, c.name, c.size, c.image_url,
         round(avg(r.overall)::numeric, 2) as avg_overall,
         count(*)::int as ratings_count
  from public.ratings r
  join public.catalog_cigars c on c.id = r.cigar_id
  where r.created_at > now() - interval '7 days'
  group by c.id, c.slug, c.brand, c.name, c.size, c.image_url;

grant select on public.cigar_rating_stats to anon, authenticated, service_role;
grant select on public.cigar_rating_week to anon, authenticated, service_role;

-- ── realtime: keep admin queues in sync across reviewers ────────────────────
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.cigar_submissions'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.lounge_submissions'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.change_requests'; exception when others then null; end;
end $$;
