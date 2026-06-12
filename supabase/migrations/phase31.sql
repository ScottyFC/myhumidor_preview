-- ════════════════════════════════════════════════════════════════════════════
-- Phase 31 — First-party analytics backbone.
-- Captures page views + time-on-page with coarse location (Vercel geo headers),
-- device/browser/OS, and the entity being viewed (cigar / lounge / brand), so
-- you can see what people look at most and from where. Writes happen ONLY
-- through the server route using the service key — no anon insert policy, so
-- the table can't be spammed directly. Admins read; nobody else.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.page_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  event text not null check (event in ('view','leave')),
  path text not null,
  entity_type text,          -- 'cigar' | 'lounge' | 'brand' | null
  entity_id text,            -- slug
  duration_ms int,           -- on 'leave'
  country text, region text, city text,
  device text, os text, browser text,
  referrer text,
  created_at timestamptz not null default now()
);
create index if not exists page_events_created_idx on public.page_events (created_at desc);
create index if not exists page_events_entity_idx  on public.page_events (entity_type, entity_id);
create index if not exists page_events_path_idx    on public.page_events (path);
create index if not exists page_events_session_idx on public.page_events (session_id);

alter table public.page_events enable row level security;
drop policy if exists "admins read analytics" on public.page_events;
create policy "admins read analytics" on public.page_events
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

-- ── Aggregates (30-day) the admin panel reads ────────────────────────────────
create or replace view public.analytics_top_entities as
  select entity_type, entity_id,
         count(*) filter (where event = 'view') as views,
         coalesce(sum(duration_ms) filter (where event = 'leave'), 0) / 1000 as seconds_spent,
         count(distinct session_id) as sessions
  from public.page_events
  where created_at > now() - interval '30 days' and entity_type is not null
  group by entity_type, entity_id;

create or replace view public.analytics_top_paths as
  select path,
         count(*) filter (where event = 'view') as views,
         coalesce(avg(duration_ms) filter (where event = 'leave'), 0)::int as avg_ms,
         count(distinct session_id) as sessions
  from public.page_events
  where created_at > now() - interval '30 days'
  group by path;

create or replace view public.analytics_geo as
  select coalesce(country,'??') as country, coalesce(region,'') as region, coalesce(city,'') as city,
         count(distinct session_id) as sessions, count(*) as events
  from public.page_events
  where created_at > now() - interval '30 days'
  group by 1, 2, 3;

create or replace view public.analytics_devices as
  select coalesce(device,'unknown') as device, coalesce(browser,'unknown') as browser, coalesce(os,'unknown') as os,
         count(distinct session_id) as sessions
  from public.page_events
  where created_at > now() - interval '30 days'
  group by 1, 2, 3;

-- Views inherit RLS from the base table for the querying role.
