-- ════════════════════════════════════════════════════════════════════════════
-- Phase 77 — Lounge page options: hide email (certified) + banner image
-- (certified). Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.lounges add column if not exists hide_email boolean not null default false;
alter table public.lounges add column if not exists banner_url text;

-- Extend update_lounge_details to also set hide_email + banner_url (certified
-- options). Backward-compatible (new params default null).
create or replace function public.update_lounge_details(
  p_slug text, p_hours_json jsonb default null, p_serves_food boolean default null,
  p_menu_url text default null, p_hide_email boolean default null, p_banner_url text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_lounge(p_slug, 'edit') then
    raise exception 'not authorized for this lounge';
  end if;
  update public.lounges set
    hours_json  = coalesce(p_hours_json, hours_json),
    serves_food = coalesce(p_serves_food, serves_food),
    menu_url    = coalesce(p_menu_url, menu_url),
    hide_email  = coalesce(p_hide_email, hide_email),
    banner_url  = coalesce(p_banner_url, banner_url)
  where slug = p_slug;
end $$;
grant execute on function public.update_lounge_details(text, jsonb, boolean, text, boolean, text) to authenticated;
