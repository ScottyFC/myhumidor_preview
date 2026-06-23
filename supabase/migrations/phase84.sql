-- Phase 84 (corrected) — Brand accounts.
-- A `brands` table already existed (id, name, country, created_at) from the original
-- relational schema, so we ADD the columns we need rather than recreating it. Fully
-- idempotent — safe to re-run after the earlier failed attempt.

-- 1. brands — extend the existing table with brand-account fields.
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null
);
alter table public.brands add column if not exists slug text;
alter table public.brands add column if not exists logo_url text;
alter table public.brands add column if not exists banner_url text;
alter table public.brands add column if not exists website text;
alter table public.brands add column if not exists description text;
alter table public.brands add column if not exists hq text;
alter table public.brands add column if not exists tier text not null default 'standard';
alter table public.brands add column if not exists verified boolean not null default false;
alter table public.brands add column if not exists claimed boolean not null default false;
alter table public.brands add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.brands add column if not exists created_at timestamptz not null default now();
alter table public.brands add column if not exists onboarding jsonb not null default '{}'::jsonb;
do $$ begin
  alter table public.brands add constraint brands_tier_check check (tier in ('standard','premium')) not valid;
exception when duplicate_object then null; end $$;
create unique index if not exists brands_slug_key on public.brands(slug) where slug is not null;
alter table public.brands enable row level security;

-- 2. brand_members — seats (owner + managers).
create table if not exists public.brand_members (
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'manager' check (role in ('owner','manager')),
  created_at timestamptz not null default now(),
  primary key (brand_id, user_id)
);
alter table public.brand_members enable row level security;

-- 3. brand_subscriptions — billing + entitlements.
create table if not exists public.brand_subscriptions (
  brand_id uuid primary key references public.brands(id) on delete cascade,
  tier text not null default 'standard' check (tier in ('standard','premium')),
  status text not null default 'pending' check (status in ('active','past_due','canceled','pending')),
  seats int not null default 2,
  monthly_boost_quota int not null default 3,
  boosts_used int not null default 0,
  boosts_period_start date not null default date_trunc('month', now())::date,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
alter table public.brand_subscriptions enable row level security;

-- 4. brand_signup_requests — pending applications (super-admin approved).
create table if not exists public.brand_signup_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  contact_name text not null,
  company text not null,
  business_address text,
  email text not null,
  website text,
  phone text,
  tax_id text,
  tier text not null default 'standard' check (tier in ('standard','premium')),
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  linked_brand_id uuid references public.brands(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
alter table public.brand_signup_requests enable row level security;

-- 5. brand_posts — upcoming releases, promos, announcements.
create table if not exists public.brand_posts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  kind text not null default 'announcement' check (kind in ('release','promo','announcement')),
  title text not null,
  body text,
  image_url text,
  link_url text,
  release_date date,
  boosted boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.brand_posts enable row level security;

-- 6. brand_review_requests — product review requests to CigarTV (premium = priority).
create table if not exists public.brand_review_requests (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  cigar_name text not null,
  cigar_slug text,
  message text,
  priority boolean not null default false,
  status text not null default 'pending' check (status in ('pending','received','scheduled','declined')),
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.brand_review_requests enable row level security;

-- Access helpers
create or replace function public.can_manage_brand_id(p_brand_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public._is_admin() or exists (
    select 1 from public.brand_members m where m.brand_id = p_brand_id and m.user_id = auth.uid()
  );
$$;
grant execute on function public.can_manage_brand_id(uuid) to authenticated;

create or replace function public.can_manage_brand(p_slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select public._is_admin() or exists (
    select 1 from public.brand_members m join public.brands b on b.id = m.brand_id
    where b.slug = p_slug and m.user_id = auth.uid()
  );
$$;
grant execute on function public.can_manage_brand(text) to authenticated;

-- RLS policies
drop policy if exists "brands public read" on public.brands;
create policy "brands public read" on public.brands for select using (true);
drop policy if exists "brands members update" on public.brands;
create policy "brands members update" on public.brands for update using (public.can_manage_brand_id(id)) with check (public.can_manage_brand_id(id));

drop policy if exists "brand_members readable" on public.brand_members;
create policy "brand_members readable" on public.brand_members for select using (user_id = auth.uid() or public.can_manage_brand_id(brand_id));

drop policy if exists "brand_subs readable" on public.brand_subscriptions;
create policy "brand_subs readable" on public.brand_subscriptions for select using (public.can_manage_brand_id(brand_id));

drop policy if exists "brand signup insert" on public.brand_signup_requests;
create policy "brand signup insert" on public.brand_signup_requests for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "brand signup own read" on public.brand_signup_requests;
create policy "brand signup own read" on public.brand_signup_requests for select using (auth.uid() = user_id or public._is_admin());

drop policy if exists "brand_posts public read" on public.brand_posts;
create policy "brand_posts public read" on public.brand_posts for select using (true);
drop policy if exists "brand_posts members write" on public.brand_posts;
create policy "brand_posts members write" on public.brand_posts for all using (public.can_manage_brand_id(brand_id)) with check (public.can_manage_brand_id(brand_id));

drop policy if exists "brand_reviews members" on public.brand_review_requests;
create policy "brand_reviews members" on public.brand_review_requests for all using (public.can_manage_brand_id(brand_id) or public._is_admin()) with check (public.can_manage_brand_id(brand_id));

-- Approve a brand signup (super admin): link by slug, then name, else create.
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
    insert into public.brands (slug, name, tier, claimed, owner_id)
    values (p_brand_slug, p_brand_name, r.tier, true, r.user_id)
    returning id into v_brand_id;
  else
    update public.brands
      set slug = coalesce(slug, p_brand_slug), claimed = true,
          owner_id = coalesce(owner_id, r.user_id), tier = r.tier
    where id = v_brand_id;
  end if;

  insert into public.brand_members (brand_id, user_id, role)
  values (v_brand_id, r.user_id, 'owner')
  on conflict (brand_id, user_id) do update set role = 'owner';

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

create or replace function public.reject_brand_signup(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  update public.brand_signup_requests set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid() where id = p_request_id;
end $$;
grant execute on function public.reject_brand_signup(uuid) to authenticated;

create or replace function public.brand_use_boost(p_brand_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare s public.brand_subscriptions;
begin
  if not public.can_manage_brand_id(p_brand_id) then raise exception 'not authorized'; end if;
  select * into s from public.brand_subscriptions where brand_id = p_brand_id for update;
  if not found then return false; end if;
  if s.boosts_period_start < date_trunc('month', now())::date then
    update public.brand_subscriptions set boosts_used = 0, boosts_period_start = date_trunc('month', now())::date where brand_id = p_brand_id;
    s.boosts_used := 0;
  end if;
  if s.boosts_used >= s.monthly_boost_quota then return false; end if;
  update public.brand_subscriptions set boosts_used = boosts_used + 1 where brand_id = p_brand_id;
  return true;
end $$;
grant execute on function public.brand_use_boost(uuid) to authenticated;
