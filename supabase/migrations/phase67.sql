-- ════════════════════════════════════════════════════════════════════════════
-- Phase 67 — Make catalog edits universal.
-- When an admin renames a cigar's brand/name via an override, propagate it to
-- the snapshot copies stored on humidor_entries and ratings (which is what the
-- profile highlight, humidor list, and reviews render), so the new name shows
-- everywhere — not just on the cigar page. Redefines the phase66 functions.
-- Idempotent. (Run after phase66.)
-- ════════════════════════════════════════════════════════════════════════════

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

  -- Propagate brand/name to stored snapshots so the change is universal.
  if p_brand is not null or p_name is not null then
    update public.humidor_entries
      set brand = coalesce(p_brand, brand), name = coalesce(p_name, name) where slug = p_slug;
    update public.ratings
      set brand = coalesce(p_brand, brand), name = coalesce(p_name, name) where slug = p_slug;
  end if;
  return p_slug;
end $$;

create or replace function public.bulk_set_catalog_override(p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare r jsonb; n int := 0; v_brand text; v_name text; v_slug text;
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    v_slug := r->>'slug';
    if coalesce(v_slug,'') = '' then continue; end if;
    v_brand := nullif(r->>'brand',''); v_name := nullif(r->>'name','');
    insert into public.catalog_overrides (slug, brand, name, country, price, image_url, buy_url, removed, updated_at)
    values (
      v_slug, v_brand, v_name, nullif(r->>'country',''),
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

    if v_brand is not null or v_name is not null then
      update public.humidor_entries set brand = coalesce(v_brand, brand), name = coalesce(v_name, name) where slug = v_slug;
      update public.ratings set brand = coalesce(v_brand, brand), name = coalesce(v_name, name) where slug = v_slug;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
