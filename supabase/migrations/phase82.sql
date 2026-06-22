-- Phase 82 — Lounges can post a drink menu (in addition to the food menu).

alter table public.lounges add column if not exists drink_menu_url text;

-- Recreate update_lounge_details with the extra drink-menu param (coalesced,
-- so existing callers that omit it leave it unchanged).
create or replace function public.update_lounge_details(
  p_slug text, p_hours_json jsonb default null, p_serves_food boolean default null,
  p_menu_url text default null, p_hide_email boolean default null, p_banner_url text default null,
  p_drink_menu_url text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_lounge(p_slug, 'edit') then
    raise exception 'not authorized for this lounge';
  end if;
  update public.lounges set
    hours_json     = coalesce(p_hours_json, hours_json),
    serves_food    = coalesce(p_serves_food, serves_food),
    menu_url       = coalesce(p_menu_url, menu_url),
    hide_email     = coalesce(p_hide_email, hide_email),
    banner_url     = coalesce(p_banner_url, banner_url),
    drink_menu_url = coalesce(p_drink_menu_url, drink_menu_url)
  where slug = p_slug;
end $$;
grant execute on function public.update_lounge_details(text, jsonb, boolean, text, boolean, text, text) to authenticated;
