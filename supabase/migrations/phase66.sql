-- ════════════════════════════════════════════════════════════════════════════
-- Phase 66 — Catalog overrides layer.
-- The browse catalog is large static JSON, so deleting a catalog_cigars row
-- cannot remove a static cigar from the site. This table lets admins remove,
-- edit, re-image, and attach a purchase link to ANY cigar (static or DB) by
-- slug; the front end merges these live. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.catalog_overrides (
  slug text primary key,
  removed boolean not null default false,
  brand text,
  name text,
  country text,
  price numeric,
  image_url text,
  buy_url text,
  updated_at timestamptz not null default now()
);
alter table public.catalog_overrides enable row level security;
drop policy if exists "catalog overrides public read" on public.catalog_overrides;
create policy "catalog overrides public read" on public.catalog_overrides for select using (true);

create or replace function public._is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'));
$$;

-- Upsert a single override. NULL args leave that field unchanged (COALESCE),
-- except p_removed which is applied directly.
create or replace function public.set_catalog_override(
  p_slug text, p_brand text default null, p_name text default null,
  p_country text default null, p_price numeric default null,
  p_image_url text default null, p_buy_url text default null,
  p_removed boolean default false
) returns text language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  insert into public.catalog_overrides (slug, brand, name, country, price, image_url, buy_url, removed, updated_at)
  values (p_slug, p_brand, p_name, p_country, p_price, p_image_url, p_buy_url, coalesce(p_removed,false), now())
  on conflict (slug) do update set
    brand = coalesce(excluded.brand, catalog_overrides.brand),
    name = coalesce(excluded.name, catalog_overrides.name),
    country = coalesce(excluded.country, catalog_overrides.country),
    price = coalesce(excluded.price, catalog_overrides.price),
    image_url = coalesce(excluded.image_url, catalog_overrides.image_url),
    buy_url = coalesce(excluded.buy_url, catalog_overrides.buy_url),
    removed = excluded.removed,
    updated_at = now();
  return p_slug;
end $$;
grant execute on function public.set_catalog_override(text,text,text,text,numeric,text,text,boolean) to authenticated;

-- Bulk upsert from a JSON array of objects (keys: slug + any of
-- brand,name,country,price,image_url,buy_url,removed). Returns rows affected.
create or replace function public.bulk_set_catalog_override(p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare r jsonb; n int := 0;
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    if coalesce(r->>'slug','') = '' then continue; end if;
    insert into public.catalog_overrides (slug, brand, name, country, price, image_url, buy_url, removed, updated_at)
    values (
      r->>'slug', nullif(r->>'brand',''), nullif(r->>'name',''), nullif(r->>'country',''),
      (nullif(r->>'price',''))::numeric, nullif(r->>'image_url',''), nullif(r->>'buy_url',''),
      coalesce((nullif(r->>'removed',''))::boolean, false), now()
    )
    on conflict (slug) do update set
      brand = coalesce(excluded.brand, catalog_overrides.brand),
      name = coalesce(excluded.name, catalog_overrides.name),
      country = coalesce(excluded.country, catalog_overrides.country),
      price = coalesce(excluded.price, catalog_overrides.price),
      image_url = coalesce(excluded.image_url, catalog_overrides.image_url),
      buy_url = coalesce(excluded.buy_url, catalog_overrides.buy_url),
      removed = coalesce((nullif(r->>'removed',''))::boolean, catalog_overrides.removed),
      updated_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.bulk_set_catalog_override(jsonb) to authenticated;

-- Let submitters include a purchase link with their cigar suggestion.
alter table public.cigar_submissions add column if not exists buy_url text;
