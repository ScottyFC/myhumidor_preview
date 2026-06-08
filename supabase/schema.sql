-- ════════════════════════════════════════════════════════════════════════════
-- MyHumidor by CigarTV — Postgres schema
--
-- Run this against a fresh Supabase project: SQL editor → New query → paste.
-- Idempotent on a FRESH database. If you've run an earlier version, the tables
-- already exist and `create table if not exists` won't pick up new columns —
-- reset the public schema first by running these four lines, then this file:
--
--   drop schema public cascade;
--   create schema public;
--   grant usage on schema public to anon, authenticated, service_role;
--   grant all on schema public to postgres, service_role;
--
-- (Safe: this only clears your tables in `public`. It does NOT touch auth.users
--  or the storage schema, so logins and the avatars bucket survive.)
-- ════════════════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis"; -- for geo queries on lounges

-- ════════════════════════════════════════════════════════════════════════════
-- USERS
-- ════════════════════════════════════════════════════════════════════════════
-- Supabase auth.users is the source of truth. We mirror profile data here.
--
-- account_type splits consumers from lounges. public_id is a TYPED identifier
-- derived from the auth UUID whose first 4 chars encode the type:
--   USER-<32 hex>  → consumer
--   LNGE-<32 hex>  → lounge
-- This is what the UI shows and what provisions the TV stick. The raw UUID (id)
-- stays the join key everywhere.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  public_id text unique not null,
  account_type text not null default 'consumer' check (account_type in ('consumer','lounge')),
  handle text unique not null,
  display_name text not null,
  avatar_url text,
  city text,
  state text,
  bio text,
  role text not null default 'consumer' check (role in ('consumer','lounge_owner','admin','super_admin')),
  created_at timestamptz not null default now()
);
create index if not exists profiles_public_id_idx on public.profiles(public_id);

-- Auto-create a profile when a user signs up (manual or OAuth). The account type
-- is passed in auth metadata at sign-up (options.data.account_type); the typed
-- public_id is derived from the new auth UUID.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  acct text := coalesce(new.raw_user_meta_data->>'account_type', 'consumer');
  tag  text := case when acct = 'lounge' then 'LNGE' else 'USER' end;
begin
  insert into public.profiles (id, public_id, account_type, role, handle, display_name)
  values (
    new.id,
    tag || '-' || replace(new.id::text, '-', ''),
    acct,
    case when acct = 'lounge' then 'lounge_owner' else 'consumer' end,
    coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


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

-- Flat catalog imported from Cigars.csv (23.5k rows). This is the searchable
-- master list the lounge inventory picker reads from. Kept separate from the
-- normalized `cigars` table above (which carries community ratings); link the
-- two by slug/uuid as you enrich the catalog over time.
create table if not exists public.catalog_cigars (
  id uuid primary key,
  brand text not null,
  name text not null,
  country text,
  price numeric(8,2),
  size text,
  slug text not null,
  image_url text
);
create index if not exists catalog_cigars_brand_idx on public.catalog_cigars(brand);
create index if not exists catalog_cigars_name_idx on public.catalog_cigars using gin (to_tsvector('english', name));
-- Trigram indexes for fuzzy / typo-tolerant search and duplicate detection
create extension if not exists pg_trgm;
create index if not exists catalog_cigars_name_trgm on public.catalog_cigars using gin (name gin_trgm_ops);
create index if not exists catalog_cigars_brand_trgm on public.catalog_cigars using gin (brand gin_trgm_ops);
alter table public.catalog_cigars enable row level security;
create policy "catalog is public" on public.catalog_cigars for select using (true);

-- ════════════════════════════════════════════════════════════════════════════
-- USER-SUBMITTED CIGARS (moderation queue)
-- ════════════════════════════════════════════════════════════════════════════
-- Users propose cigars here; they never write to catalog_cigars directly. An
-- admin (or automated check) approves a submission, which copies it into the
-- catalog and credits the submitter. Photos live in Supabase Storage — only the
-- URL is stored here.
create table if not exists public.cigar_submissions (
  id uuid primary key default uuid_generate_v4(),
  submitted_by uuid references public.profiles(id) on delete set null,
  brand text not null,
  name text not null,
  country text,
  size text,
  price numeric(8,2),
  photo_url text,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists submissions_status_idx on public.cigar_submissions(status);
create index if not exists submissions_user_idx on public.cigar_submissions(submitted_by);
-- catch likely duplicates against existing submissions
create index if not exists submissions_name_trgm on public.cigar_submissions using gin (name gin_trgm_ops);

alter table public.cigar_submissions enable row level security;

-- Anyone signed in can submit
create policy "users submit cigars" on public.cigar_submissions
  for insert with check (auth.uid() = submitted_by);
-- Submitters see their own submissions and their status
create policy "users see own submissions" on public.cigar_submissions
  for select using (auth.uid() = submitted_by);
-- Admins review everything
create policy "admins review submissions" on public.cigar_submissions
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

-- Helper: fuzzy duplicate check before accepting a submission.
-- SELECT * FROM find_similar_cigars('padron 1964', 0.4);
create or replace function public.find_similar_cigars(q text, threshold real default 0.3)
returns table (id uuid, brand text, name text, slug text, similarity real)
language sql stable as $$
  select c.id, c.brand, c.name, c.slug, similarity(c.name, q) as similarity
  from public.catalog_cigars c
  where c.name % q
  order by similarity desc
  limit 8
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- RATINGS
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.ratings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cigar_id uuid not null references public.catalog_cigars(id) on delete cascade,
  flavor_score int not null check (flavor_score between 1 and 5),
  burn_score int not null check (burn_score between 1 and 5),
  appearance_score int not null check (appearance_score between 1 and 5),
  overall numeric(3,2) not null,
  notes text,
  tasting_notes text[] not null default '{}',
  -- denormalized for fast rendering on profiles
  brand text,
  name text,
  size text,
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cigar_id)
);
create index if not exists ratings_cigar_idx on public.ratings(cigar_id);
create index if not exists ratings_user_idx on public.ratings(user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- HUMIDOR
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.humidor_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cigar_id uuid not null references public.catalog_cigars(id) on delete cascade,
  status text not null default 'humidor' check (status in ('humidor','wishlist')),
  -- denormalized for fast list rendering without a join
  brand text,
  name text,
  size text,
  slug text,
  quantity int not null default 1 check (quantity >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, cigar_id)
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
  email text,
  image_url text,
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
-- Each lounge's TV stick is provisioned with the lounge's typed public_id
-- (LNGE-…). The stick reports watch time against lounge_public_id; the ingest
-- endpoint validates the LNGE- prefix before accepting an event (cheap reject of
-- bad/consumer IDs without a DB hit), resolves it to the lounge, and a scheduled
-- job converts accepted watch time into credits in credit_ledger.
create table if not exists public.tv_devices (
  id uuid primary key default uuid_generate_v4(),
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  lounge_public_id text not null,            -- LNGE-… the stick is keyed to
  serial text not null unique,
  paired_at timestamptz,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tv_devices_public_idx on public.tv_devices(lounge_public_id);

create table if not exists public.viewership_events (
  id uuid primary key default uuid_generate_v4(),
  device_id uuid not null references public.tv_devices(id) on delete cascade,
  lounge_public_id text not null,            -- denormalized for fast rollups
  episode_guid text references public.episodes(guid) on delete set null,
  duration_sec int not null,
  recorded_at timestamptz not null default now()
);
create index if not exists viewership_device_idx on public.viewership_events(device_id, recorded_at desc);
create index if not exists viewership_lounge_idx on public.viewership_events(lounge_public_id, recorded_at desc);

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

-- Self-only writes for consumer data
create policy "users manage own ratings" on public.ratings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own humidor" on public.humidor_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "humidor entries are public" on public.humidor_entries
  for select using (true);

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

-- ════════════════════════════════════════════════════════════════════════════
-- SOCIAL: FOLLOWS + LOUNGE POSTS (home feed)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);
alter table public.follows enable row level security;
create policy "follows are public" on public.follows for select using (true);
create policy "users manage own follows" on public.follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- Lounge posts power the feed (deals, new arrivals, events). `promoted` is set
-- when a lounge spends credits to boost a post.
create table if not exists public.lounge_posts (
  id uuid primary key default uuid_generate_v4(),
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  kind text not null check (kind in ('deal','new_arrival','event')),
  title text not null,
  body text,
  cigar_id uuid references public.catalog_cigars(id) on delete set null,
  promoted boolean not null default false,
  event_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists lounge_posts_recent_idx on public.lounge_posts(created_at desc);
alter table public.lounge_posts enable row level security;
create policy "lounge posts are public" on public.lounge_posts for select using (true);

-- The home feed = recent posts from followed users' activity + lounge_posts from
-- lounges the user follows or that are nearby/promoted. Assembled in the app
-- (or a view) from follows + ratings + humidor_entries + lounge_posts.

-- ════════════════════════════════════════════════════════════════════════════
-- BOOTSTRAP SUPER ADMIN
-- ════════════════════════════════════════════════════════════════════════════
-- The founding admin (public_id USER-cd2c8383eb384b379fda954b90e99b49). Run this
-- AFTER the user has signed up so the profile row exists.
update public.profiles
   set role = 'super_admin'
 where id = 'cd2c8383-eb38-4b37-9fda-954b90e99b49';

-- Only admins may approve submissions / claims (already enforced via the
-- "admins review submissions" policy; mirror for super_admin):
create policy "super admins review submissions" on public.cigar_submissions
  for all using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

-- ════════════════════════════════════════════════════════════════════════════
-- ROLE PRIVILEGES (Supabase defaults)
-- Restores the grants Supabase normally has on `public`. Required after a
-- `drop schema public cascade` reset, otherwise service_role / anon get
-- "permission denied for table". RLS still gates anon/authenticated;
-- service_role bypasses RLS (used by the seed script).
-- ════════════════════════════════════════════════════════════════════════════
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
