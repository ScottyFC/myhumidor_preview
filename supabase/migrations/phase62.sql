-- ════════════════════════════════════════════════════════════════════════════
-- Phase 62 — Admins can grant/revoke Verified Aficionado on a member profile.
-- SECURITY DEFINER + admin check (mirrors set_brand_image / set_cert_tier).
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.set_aficionado(p_handle text, p_on boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')
  ) then
    raise exception 'admins only';
  end if;

  update public.profiles set aficionado = p_on where handle = p_handle;
  return p_on;
end $$;

grant execute on function public.set_aficionado(text, boolean) to authenticated;
