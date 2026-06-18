-- ════════════════════════════════════════════════════════════════════════════
-- Phase 71 — Lounge tooling: opening hours, food badge + menu, and an
-- owner/admin updater. inventory_items already has quantity/published (phase7).
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.lounges add column if not exists hours_json jsonb;
alter table public.lounges add column if not exists serves_food boolean not null default false;
alter table public.lounges add column if not exists menu_url text;

-- Owner (or admin) updates these dashboard details. Food/menu are gated to
-- certified lounges in the UI; the RPC still lets an owner clear them.
create or replace function public.update_lounge_details(
  p_slug text, p_hours_json jsonb default null, p_serves_food boolean default null, p_menu_url text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.lounges l
    where l.slug = p_slug
      and (l.owner_id = auth.uid()
           or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')))
  ) then
    raise exception 'not authorized for this lounge';
  end if;
  update public.lounges set
    hours_json  = coalesce(p_hours_json, hours_json),
    serves_food = coalesce(p_serves_food, serves_food),
    menu_url    = coalesce(p_menu_url, menu_url)
  where slug = p_slug;
end $$;
grant execute on function public.update_lounge_details(text, jsonb, boolean, text) to authenticated;
