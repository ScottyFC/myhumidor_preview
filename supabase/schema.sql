-- ════════════════════════════════════════════════════════════════════════════
-- MyHumidor by CigarTV — Postgres schema
--
-- Run this against a fresh Supabase project: SQL editor → New query → paste.
-- Idempotent: re-runnable on a fresh database. Drop the schema first if
-- iterating.
-- ════════════════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis"; -- for geo queries on lounges

-- ════════════════════════════════════════════════════════════════════════════
-- USERS
-- ════════════════════════════════════════════════════════════════════════════
-- Supabase auth.users is the source of truth. We mirror profile data here.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  avatar_url text,
  role text not null default 'consumer' check (role in ('consumer','lounge_owner','admin')),
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- CIGAR CATALOG
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  country text,
  created_at timestamptz not null default now()
);

create table if not exists public.cigars (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  slug text not null unique,
  line_name text not null,
  vitola text not null,
  wrapper text not null,
  binder text,
  filler text,
  length_in numeric(3,1) not null,
  ring_gauge int not null,
  country_of_origin text,
  msrp numeric(6,2),
  image_url text,
  -- Denormalized aggregates updated by trigger on rating changes
  rating_count int not null default 0,
  flavor_avg numeric(3,2) default 0,
  burn_avg numeric(3,2) default 0,
  appearance_avg numeric(3,2) default 0,
  overall_avg numeric(3,2) default 0,
  created_at timestamptz not null default now()
);
create index if not exists cigars_brand_idx on public.cigars(brand_id);
create index if not exists cigars_overall_idx on public.cigars(overall_avg desc);

-- ════════════════════════════════════════════════════════════════════════════
-- RATINGS
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.ratings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cigar_id uuid not null references public.cigars(id) on delete cascade,
  flavor_score int not null check (flavor_score between 1 and 5),
  burn_score int not null check (burn_score between 1 and 5),
  appearance_score int not null check (appearance_score between 1 and 5),
  overall numeric(3,2) not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cigar_id)
);
create index if not exists ratings_cigar_idx on public.ratings(cigar_id);
create index if not exists ratings_user_idx on public.ratings(user_id);

create table if not exists public.tasting_notes (
  id uuid primary key default uuid_generate_v4(),
  rating_id uuid not null references public.ratings(id) on delete cascade,
  descriptor text not null
);
create index if not exists tasting_notes_rating_idx on public.tasting_notes(rating_id);
create index if not exists tasting_notes_descriptor_idx on public.tasting_notes(descriptor);

-- Trigger: recompute cigar aggregates whenever a rating changes
create or replace function public.update_cigar_aggregates() returns trigger
  language plpgsql as $$
begin
  update public.cigars c set
    rating_count = (select count(*) from public.ratings where cigar_id = c.id),
    flavor_avg   = coalesce((select avg(flavor_score) from public.ratings where cigar_id = c.id), 0),
    burn_avg     = coalesce((select avg(burn_score) from public.ratings where cigar_id = c.id), 0),
    appearance_avg = coalesce((select avg(appearance_score) from public.ratings where cigar_id = c.id), 0),
    overall_avg  = coalesce((select avg(overall) from public.ratings where cigar_id = c.id), 0)
  where c.id = coalesce(new.cigar_id, old.cigar_id);
  return null;
end $$;

drop trigger if exists ratings_aggregate_trigger on public.ratings;
create trigger ratings_aggregate_trigger
  after insert or update or delete on public.ratings
  for each row execute function public.update_cigar_aggregates();

-- ════════════════════════════════════════════════════════════════════════════
-- HUMIDOR
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.humidor_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cigar_id uuid not null references public.cigars(id) on delete cascade,
  quantity int not null default 1 check (quantity >= 0),
  status text not null default 'ready' check (status in ('aging','ready','smoked','wishlist')),
  acquired_at date,
  created_at timestamptz not null default now()
);
create index if not exists humidor_user_idx on public.humidor_entries(user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- BADGES
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.badges (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  criteria text not null,
  tier text not null default 'bronze' check (tier in ('bronze','silver','gold','rare'))
);

create table if not exists public.badge_awards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- LOUNGES
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.lounges (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  address text not null,
  city text not null,
  state text not null,
  postal_code text,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  geo geography(point) generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  verified boolean not null default false,
  owner_id uuid references public.profiles(id) on delete set null,
  phone text,
  website text,
  hours text,
  created_at timestamptz not null default now()
);
create index if not exists lounges_geo_idx on public.lounges using gist(geo);
create index if not exists lounges_verified_idx on public.lounges(verified);

create table if not exists public.inventory_items (
  id uuid primary key default uuid_generate_v4(),
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  cigar_id uuid not null references public.cigars(id) on delete cascade,
  price numeric(6,2),
  in_stock boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (lounge_id, cigar_id)
);
create index if not exists inventory_lounge_idx on public.inventory_items(lounge_id);
create index if not exists inventory_cigar_idx on public.inventory_items(cigar_id);

-- ════════════════════════════════════════════════════════════════════════════
-- CONTENT (EPISODES & FEATURED CIGARS)
-- ════════════════════════════════════════════════════════════════════════════
-- We cache episode metadata from the MRSS feed so we can attach FK references
-- (featured cigars, view events) without depending on the feed being parseable
-- at query time.
create table if not exists public.episodes (
  guid text primary key,
  series text not null,
  season_num int not null,
  episode_num int not null,
  title text not null,
  description text,
  pub_date date,
  video_url text not null,
  thumbnail_url text,
  duration_sec int,
  cue_points int[],
  created_at timestamptz not null default now()
);
create index if not exists episodes_series_idx on public.episodes(series);
create index if not exists episodes_pub_idx on public.episodes(pub_date desc);

create table if not exists public.featured_cigars (
  id uuid primary key default uuid_generate_v4(),
  episode_guid text not null references public.episodes(guid) on delete cascade,
  cigar_id uuid not null references public.cigars(id) on delete cascade,
  start_ts_sec int not null default 0,
  end_ts_sec int,
  unique (episode_guid, cigar_id, start_ts_sec)
);
create index if not exists featured_episode_idx on public.featured_cigars(episode_guid);
create index if not exists featured_cigar_idx on public.featured_cigars(cigar_id);

-- ════════════════════════════════════════════════════════════════════════════
-- TV DEVICES & CREDIT ECONOMY
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.tv_devices (
  id uuid primary key default uuid_generate_v4(),
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  serial text not null unique,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.viewership_events (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid not null references public.tv_devices(id) on delete cascade,
  episode_guid text references public.episodes(guid) on delete set null,
  duration_sec int not null,
  recorded_at timestamptz not null default now()
);
create index if not exists viewership_device_idx on public.viewership_events(device_id, recorded_at desc);

create table if not exists public.credit_ledger (
  id uuid primary key default uuid_generate_v4(),
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  delta int not null,
  reason text not null,
  recorded_at timestamptz not null default now()
);
create index if not exists credit_lounge_idx on public.credit_ledger(lounge_id, recorded_at desc);

create table if not exists public.ad_campaigns (
  id uuid primary key default uuid_generate_v4(),
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  budget_credits int not null,
  spent_credits int not null default 0,
  status text not null default 'active' check (status in ('draft','active','paused','completed')),
  started_at timestamptz not null default now(),
  ends_at timestamptz
);

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.cigars enable row level security;
alter table public.brands enable row level security;
alter table public.ratings enable row level security;
alter table public.tasting_notes enable row level security;
alter table public.humidor_entries enable row level security;
alter table public.badge_awards enable row level security;
alter table public.lounges enable row level security;
alter table public.inventory_items enable row level security;
alter table public.tv_devices enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.viewership_events enable row level security;

-- Read-everywhere tables (public reference data)
create policy "cigars are public" on public.cigars for select using (true);
create policy "brands are public" on public.brands for select using (true);
create policy "lounges are public" on public.lounges for select using (true);
create policy "inventory is public" on public.inventory_items for select using (true);
create policy "profiles are public" on public.profiles for select using (true);
create policy "ratings are public" on public.ratings for select using (true);
create policy "tasting_notes are public" on public.tasting_notes for select using (true);

-- Self-only writes for consumer data
create policy "users manage own ratings" on public.ratings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own humidor" on public.humidor_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users see own humidor" on public.humidor_entries
  for select using (auth.uid() = user_id);

create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Lounge owners manage their own lounge data
create policy "owners manage their lounge inventory" on public.inventory_items
  for all using (
    exists (select 1 from public.lounges where lounges.id = inventory_items.lounge_id and lounges.owner_id = auth.uid())
  );

create policy "owners see their credit ledger" on public.credit_ledger
  for select using (
    exists (select 1 from public.lounges where lounges.id = credit_ledger.lounge_id and lounges.owner_id = auth.uid())
  );

create policy "owners manage their ad campaigns" on public.ad_campaigns
  for all using (
    exists (select 1 from public.lounges where lounges.id = ad_campaigns.lounge_id and lounges.owner_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════════════════
-- SEED BADGES
-- ════════════════════════════════════════════════════════════════════════════
insert into public.badges (slug, name, criteria, tier) values
  ('first-light', 'First Light', 'Rate your first cigar', 'bronze'),
  ('humidor-stocked', 'Humidor Stocked', 'Add 10 cigars to your humidor', 'bronze'),
  ('aged-to-perfection', 'Aged to Perfection', 'Smoke a cigar after aging it 12+ months', 'silver'),
  ('lounge-crawler', 'Lounge Crawler', 'Visit 5 verified CigarTV lounges', 'silver'),
  ('tagged-by-cigartv', 'Tagged by CigarTV', 'Rate a cigar within 24 hrs of its episode airing', 'gold'),
  ('rare-leaf', 'Rare Leaf', 'Rate a cigar with fewer than 100 community ratings', 'gold'),
  ('palate-pioneer', 'Palate Pioneer', 'Tag 25 unique tasting notes across your ratings', 'silver'),
  ('opus-club', 'Opus Club', 'Rate an Arturo Fuente Fuente Fuente OpusX vitola', 'rare'),
  ('vintage-hunter', 'Vintage Hunter', 'Rate a cigar from a production year older than yourself', 'rare')
on conflict (slug) do nothing;
