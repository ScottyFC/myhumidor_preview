-- ════════════════════════════════════════════════════════════════════════════
-- Phase 78 — Custom collectible badges for PREMIER lounges. Owners create a
-- badge (transparent PNG + name) or request artwork from the team; users earn it
-- by checking in. First badge free, additional are billable. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- Allow the 'lounge' tier value + add badge workflow columns.
alter table public.badges drop constraint if exists badges_tier_check;
alter table public.badges add column if not exists status text not null default 'active';        -- active | pending_artwork
alter table public.badges add column if not exists needs_artwork boolean not null default false;
alter table public.badges add column if not exists billable boolean not null default false;

-- Premier-only badge creation. First badge per lounge is free; later ones are
-- flagged billable. needs_artwork (or no image) → pending_artwork for the team.
create or replace function public.create_lounge_badge(
  p_slug text, p_name text, p_image_url text default null, p_needs_artwork boolean default false
) returns jsonb language plpgsql security definer set search_path = public as $$
declare lid uuid; tier text; cnt int; bslug text; is_billable boolean; st text; want_art boolean;
begin
  select id, cert_tier into lid, tier from public.lounges where slug = p_slug;
  if lid is null then raise exception 'lounge not found'; end if;
  if not public.can_manage_lounge(p_slug, 'edit') then raise exception 'not authorized for this lounge'; end if;
  if coalesce(tier,'none') <> 'premier' then raise exception 'Collectible badges are a Premier feature'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Badge name is required'; end if;

  select count(*) into cnt from public.badges where lounge_id = lid;
  is_billable := cnt >= 1;                       -- first badge is free
  want_art := p_needs_artwork or p_image_url is null;
  st := case when want_art then 'pending_artwork' else 'active' end;
  bslug := 'lounge-' || left(lid::text, 8) || '-' ||
           left(regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g'), 40) || '-' ||
           left(md5(random()::text), 4);

  insert into public.badges (slug, name, criteria, tier, image_url, lounge_id, status, needs_artwork, billable)
  values (bslug, p_name, 'Awarded for checking in at this lounge.', 'lounge', p_image_url, lid, st, want_art, is_billable);

  return jsonb_build_object('ok', true, 'billable', is_billable, 'status', st);
end $$;
grant execute on function public.create_lounge_badge(text, text, text, boolean) to authenticated;

-- Super-admin: attach artwork to a requested badge and activate it.
create or replace function public.admin_set_badge_artwork(p_badge_id uuid, p_image_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'admins only';
  end if;
  update public.badges set image_url = p_image_url, needs_artwork = false, status = 'active' where id = p_badge_id;
end $$;
grant execute on function public.admin_set_badge_artwork(uuid, text) to authenticated;
