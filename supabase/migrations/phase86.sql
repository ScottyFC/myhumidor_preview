-- Phase 86 — Brand applications without sign-in (brands are a separate division).

-- 1. Anyone (anon or authenticated) can submit a brand application — no login required.
--    user_id stays nullable; it's only set if the applicant happened to be signed in.
drop policy if exists "brand signup insert" on public.brand_signup_requests;
create policy "brand signup insert" on public.brand_signup_requests
  for insert to anon, authenticated with check (true);

-- 2. Carry the applicant's contact email onto the brand so a (separate-division) brand
--    login can be provisioned/linked later.
alter table public.brands add column if not exists contact_email text;

-- 3. Approve tolerating a missing user_id: create/link the brand + subscription; only
--    attach an owner member when we actually have a user. Otherwise the brand is
--    provisioned 'unclaimed' and an operator is linked later via admin_link_brand_owner.
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

  update public.brand_signup_requests
    set status = 'approved', linked_brand_id = v_brand_id, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_request_id;

  return v_brand_id;
end $$;
grant execute on function public.approve_brand_signup(uuid, text, text) to authenticated;

-- 4. Link a brand operator (the separate-division login) to a brand (super admin).
create or replace function public.admin_link_brand_owner(p_brand_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  insert into public.brand_members (brand_id, user_id, role)
  values (p_brand_id, p_user_id, 'owner')
  on conflict (brand_id, user_id) do update set role = 'owner';
  update public.brands set owner_id = coalesce(owner_id, p_user_id), claimed = true where id = p_brand_id;
end $$;
grant execute on function public.admin_link_brand_owner(uuid, uuid) to authenticated;
