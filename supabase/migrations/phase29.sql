-- ════════════════════════════════════════════════════════════════════════════
-- Phase 29 — Certification tiers (Untappd-for-Business model).
-- Verification stays free; certification = one of three paid tiers chosen and
-- changed from the dashboard. `certified` stays in sync with the tier.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.lounges add column if not exists cert_tier text not null default 'none'
  check (cert_tier in ('none','starter','pro','premier'));

-- Legacy lounges that were certified before tiers existed land on Starter.
update public.lounges set cert_tier = 'starter' where certified = true and cert_tier = 'none';

-- Change tier from the dashboard. SECURITY DEFINER + membership check so only
-- the lounge's own team can move it; certified flips automatically.
create or replace function public.set_cert_tier(p_lounge uuid, p_tier text)
returns text language plpgsql security definer set search_path = public as $$
begin
  if p_tier not in ('none','starter','pro','premier') then
    raise exception 'invalid tier %', p_tier;
  end if;
  if not exists (
    select 1 from lounge_members m where m.lounge_id = p_lounge and m.user_id = auth.uid()
  ) then
    raise exception 'not a member of this lounge';
  end if;
  update lounges
     set cert_tier = p_tier,
         certified = (p_tier <> 'none')
   where id = p_lounge;
  return p_tier;
end $$;
grant execute on function public.set_cert_tier(uuid, text) to authenticated;
