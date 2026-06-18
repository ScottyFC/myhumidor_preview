-- ════════════════════════════════════════════════════════════════════════════
-- Phase 70 — Admin: assign a lounge owner (with their retailer account) and
-- explicit certified toggle. Plus an "owns multiple lounges" flag captured at
-- signup (configured later). Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists owns_multiple boolean not null default false;

-- Admin: set/clear a lounge's certification (definer so it bypasses RLS safely).
create or replace function public.admin_set_certified(p_slug text, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'admins only';
  end if;
  update public.lounges set certified = p_on, verified = (verified or p_on) where slug = p_slug;
end $$;
grant execute on function public.admin_set_certified(text, boolean) to authenticated;

-- Admin: assign a lounge's owner by member handle and promote them to a
-- retailer / lounge-owner account so they can manage it.
create or replace function public.admin_assign_owner(p_slug text, p_handle text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid; dn text;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'admins only';
  end if;
  select id, coalesce(display_name, handle) into uid, dn from profiles where lower(handle) = lower(p_handle);
  if uid is null then raise exception 'no member with handle %', p_handle; end if;
  update public.lounges set owner_id = uid where slug = p_slug;
  update public.profiles set account_type = 'retailer',
         role = case when role in ('admin','super_admin') then role else 'lounge_owner' end
   where id = uid;
  return dn;
end $$;
grant execute on function public.admin_assign_owner(text, text) to authenticated;
