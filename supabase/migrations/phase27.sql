-- ════════════════════════════════════════════════════════════════════════════
-- Phase 27 — Geospatial backbone for real-time stock at local lounges.
--
-- Before: nearby lookups pulled 200 lounge rows and sorted by haversine in JS.
-- After:  PostGIS geography + GIST index, with two indexed RPCs the API calls:
--           lounges_near(lat,lng,radius)          → closest lounges + distance
--           cigar_stock_near(slug,lat,lng,radius) → who stocks it near me, live
-- Real-time: inventory_items keeps an updated_at touch trigger and is added to
-- the supabase_realtime publication so clients can subscribe to stock changes.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists postgis;

-- 1) Geography column, generated from the lat/lng we already store (stays in
--    perfect sync; null when the lounge hasn't been geocoded yet) + GIST index.
alter table public.lounges
  add column if not exists location geography(point, 4326)
  generated always as (
    case when lat is not null and lng is not null
         then st_setsrid(st_makepoint(lng::float8, lat::float8), 4326)::geography
    end
  ) stored;

create index if not exists lounges_location_gix on public.lounges using gist (location);

-- 2) Real-time stock: touch updated_at on every change and publish the table.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists inventory_touch on public.inventory_items;
create trigger inventory_touch
  before update on public.inventory_items
  for each row execute function public.touch_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.inventory_items;
exception when duplicate_object then null;
end $$;

-- 3) Closest lounges to a point (GIST-indexed, distance in meters).
create or replace function public.lounges_near(
  p_lat float8, p_lng float8,
  p_radius_m int default 40000,
  p_limit int default 25
)
returns table (
  id uuid, slug text, name text, address text, city text, state text,
  lat numeric, lng numeric, verified boolean, certified boolean,
  image_url text, distance_m float8
)
language sql stable as $$
  select l.id, l.slug, l.name, l.address, l.city, l.state,
         l.lat, l.lng, l.verified, l.certified, l.image_url,
         st_distance(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.lounges l
  where l.location is not null
    and st_dwithin(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by l.location <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit least(p_limit, 100);
$$;

grant execute on function public.lounges_near(float8, float8, int, int) to anon, authenticated;

-- 4) Live stock near me for a cigar: lounges within radius that have the cigar
--    in stock right now, closest first, with price and freshness.
create or replace function public.cigar_stock_near(
  p_slug text,
  p_lat float8, p_lng float8,
  p_radius_m int default 40000,
  p_limit int default 25
)
returns table (
  lounge_id uuid, lounge_slug text, lounge_name text, city text, state text,
  price numeric, in_stock boolean, stock_updated_at timestamptz, distance_m float8
)
language sql stable as $$
  select l.id, l.slug, l.name, l.city, l.state,
         i.price, i.in_stock, i.updated_at,
         st_distance(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m
  from public.inventory_items i
  join public.cigars c on c.id = i.cigar_id
  join public.lounges l on l.id = i.lounge_id
  where c.slug = p_slug
    and i.in_stock
    and l.location is not null
    and st_dwithin(l.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by l.location <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit least(p_limit, 100);
$$;

grant execute on function public.cigar_stock_near(text, float8, float8, int, int) to anon, authenticated;
