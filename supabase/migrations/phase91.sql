-- Phase 91 — Approval implies email-verified (prevents email-delivery dead-ends).
-- A super admin approving a brand is the real trust gate; an approved brand should never
-- be locked out of login because a verification email failed to deliver. Self-serve
-- verification still happens pre-approval when email is configured; approval is the backstop.

create or replace function public.approve_brand_signup(
  p_request_id uuid, p_brand_name text, p_brand_slug text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  r public.brand_signup_requests;
  v_brand_id uuid;
  v_quota int;
  v_seats int;
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  select * into r from public.brand_signup_requests where id = p_request_id;
  if not found then raise exception 'request not found'; end if;

  select id into v_brand_id from public.brands where slug = p_brand_slug;
  if v_brand_id is null then
    select id into v_brand_id from public.brands where lower(name) = lower(p_brand_name) limit 1;
  end if;

  if v_brand_id is null then
    insert into public.brands (slug, name, tier, claimed, owner_id, contact_email)
    values (p_brand_slug, p_brand_name, r.tier, r.user_id is not null, r.user_id, r.email)
    returning id into v_brand_id;
  else
    update public.brands
      set slug = coalesce(slug, p_brand_slug),
          claimed = (claimed or r.user_id is not null),
          owner_id = coalesce(owner_id, r.user_id),
          tier = r.tier,
          contact_email = coalesce(contact_email, r.email)
    where id = v_brand_id;
  end if;

  if r.user_id is not null then
    insert into public.brand_members (brand_id, user_id, role)
    values (v_brand_id, r.user_id, 'owner')
    on conflict (brand_id, user_id) do update set role = 'owner';
  end if;

  v_quota := case when r.tier = 'premium' then 999 else 3 end;
  v_seats := case when r.tier = 'premium' then 5 else 2 end;
  insert into public.brand_subscriptions (brand_id, tier, status, seats, monthly_boost_quota)
  values (v_brand_id, r.tier, case when r.tier = 'premium' then 'pending' else 'active' end, v_seats, v_quota)
  on conflict (brand_id) do update set tier = excluded.tier, seats = excluded.seats, monthly_boost_quota = excluded.monthly_boost_quota;

  -- Activate the brand-auth login AND mark email verified (approval is the trust gate).
  update public.brand_auth_accounts
    set brand_id = v_brand_id, status = 'active', email_verified = true
  where lower(email) = lower(r.email) and status <> 'disabled';

  update public.brand_signup_requests
    set status = 'approved', linked_brand_id = v_brand_id, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id;

  return v_brand_id;
end $$;
grant execute on function public.approve_brand_signup(uuid, text, text) to authenticated;

-- One-off: unblock the already-approved scott@cigartv.com account right now.
update public.brand_auth_accounts set email_verified = true, status = 'active'
where lower(email) = lower('scott@cigartv.com') and status <> 'disabled';
