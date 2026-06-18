-- ════════════════════════════════════════════════════════════════════════════
-- Phase 70 — Admin lounge controls: remove/grant certification and assign an
-- owner (by handle) whose account becomes a retailer. Admin/super-admin only.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public._is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'));
$$;

-- Grant or remove certification on any lounge. Keeps cert_tier in sync.
create or replace function public.admin_set_certification(p_slug text, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  update public.lounges
     set certified = p_on,
         cert_tier = case when p_on then (case when cert_tier = 'none' or cert_tier is null then 'starter' else cert_tier end) else 'none' end
   where slug = p_slug;
end $$;
grant execute on function public.admin_set_certification(text, boolean) to authenticated;

-- Assign a lounge's owner by member handle; that account becomes a retailer.
create or replace function public.admin_set_lounge_owner(p_slug text, p_handle text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid; nm text;
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  select id, coalesce(display_name, handle) into uid, nm
  from public.profiles where lower(handle) = lower(p_handle);
  if uid is null then raise exception 'no member with handle %', p_handle; end if;
  update public.lounges set owner_id = uid where slug = p_slug;
  update public.profiles
     set account_type = 'retailer',
         role = case when role in ('admin','super_admin') then role else 'lounge_owner' end
   where id = uid;
  return nm;
end $$;
grant execute on function public.admin_set_lounge_owner(text, text) to authenticated;
