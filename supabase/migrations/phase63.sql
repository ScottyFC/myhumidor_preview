-- ════════════════════════════════════════════════════════════════════════════
-- Phase 63 — Distinguish sit-down lounges from retailers that merely sell cigars
-- (liquor stores like Total Wine, ABC, etc.). venue_type:
--   'lounge' — sit-down venue you can smoke at (default)
--   'retail' — sells cigars, NOT a smoking lounge
--   'both'   — retailer with an on-site lounge
-- Owners or admins can set it. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.lounges add column if not exists venue_type text not null default 'lounge';
alter table public.lounges drop constraint if exists lounges_venue_type_check;
alter table public.lounges add constraint lounges_venue_type_check
  check (venue_type in ('lounge','retail','both'));

create or replace function public.set_venue_type(p_slug text, p_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_type not in ('lounge','retail','both') then
    raise exception 'invalid venue_type';
  end if;
  if not exists (
    select 1 from lounges l
    where l.slug = p_slug
      and (
        l.owner_id = auth.uid()
        or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
      )
  ) then
    raise exception 'not authorized for this lounge';
  end if;
  update public.lounges set venue_type = p_type where slug = p_slug;
  return p_type;
end $$;

grant execute on function public.set_venue_type(text, text) to authenticated;
