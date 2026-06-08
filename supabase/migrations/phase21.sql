-- ════════════════════════════════════════════════════════════════════════════
-- Phase 21 — In-house ad server: targetable ad spots + impression log.
-- Spots are served by GET /api/ads (feeds the TV app's AD_FEED_URL).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.ad_spots (
  id uuid primary key default uuid_generate_v4(),
  advertiser text,
  headline text not null,
  subtext text,
  qr_url text,
  image_url text,
  -- Geo targeting: when lat/lng/radius_km are set, the spot only serves to
  -- devices within radius_km of (lat,lng). Null = global.
  lat double precision,
  lng double precision,
  radius_km double precision,
  -- Flight window (null = always live) and rotation weight.
  starts_at timestamptz,
  ends_at timestamptz,
  weight int not null default 1,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ad_spots_active_idx on public.ad_spots(active, starts_at, ends_at);
alter table public.ad_spots enable row level security;

-- Anyone may READ spots that are currently live (so the public endpoint works
-- with the anon key as well as the service key).
drop policy if exists "read live ad spots" on public.ad_spots;
create policy "read live ad spots" on public.ad_spots
  for select using (
    active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

-- Admins manage everything (including inactive/scheduled spots).
drop policy if exists "admins manage ad spots" on public.ad_spots;
create policy "admins manage ad spots" on public.ad_spots
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );
grant all on public.ad_spots to anon, authenticated, service_role;

-- ── Impression log (optional analytics; the player can POST when a spot shows) ─
create table if not exists public.ad_impressions (
  id uuid primary key default uuid_generate_v4(),
  ad_id uuid references public.ad_spots(id) on delete cascade,
  device_id uuid references public.lounge_devices(id) on delete set null,
  lounge_id uuid references public.lounges(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ad_impressions_ad_idx on public.ad_impressions(ad_id, created_at desc);
alter table public.ad_impressions enable row level security;

-- Signed-in devices may log impressions; admins read them.
drop policy if exists "log impressions" on public.ad_impressions;
create policy "log impressions" on public.ad_impressions
  for insert to authenticated with check (true);
drop policy if exists "admins read impressions" on public.ad_impressions;
create policy "admins read impressions" on public.ad_impressions
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );
grant all on public.ad_impressions to anon, authenticated, service_role;
