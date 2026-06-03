-- ════════════════════════════════════════════════════════════════════════════
-- Phase 10 migration — run once. Safe to run even if earlier migrations were
-- missed (uses "if not exists" / idempotent statements).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Safety net: ensure the moderation columns exist (from phase7 / phase9) ──
alter table public.cigar_submissions  add column if not exists catalog_id uuid;
alter table public.lounge_submissions add column if not exists lounge_id uuid;
alter table public.lounge_submissions add column if not exists claims_ownership boolean not null default false;
alter table public.lounge_submissions add column if not exists role_requested text;

-- ── Sole super admin ────────────────────────────────────────────────────────
-- Demote everyone, then promote the one account.
update public.profiles set role = 'consumer' where role in ('admin','super_admin');
update public.profiles set role = 'super_admin'
  where id = '33b6d710-4a01-4f8b-8bca-d6b1499ef96e';

-- ── Collision-safe signup trigger ───────────────────────────────────────────
-- A duplicate email-prefix used to violate the unique `handle` and abort signup
-- (profile never created → "sign-ups not coming through"). This version finds a
-- free handle and never throws.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  base text;
  h text;
  n int := 0;
  dn text;
  at text;
begin
  base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if base is null or base = '' then base := 'member'; end if;
  h := base;
  while exists (select 1 from public.profiles where handle = h) loop
    n := n + 1;
    h := base || n::text;
  end loop;

  dn := coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), initcap(base));
  at := coalesce(nullif(new.raw_user_meta_data->>'account_type', ''), 'consumer');

  insert into public.profiles (id, public_id, handle, display_name, role, account_type)
  values (
    new.id,
    'USER-' || replace(new.id::text, '-', ''),
    h,
    dn,
    'consumer',
    at
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Lounge tiers ────────────────────────────────────────────────────────────
alter table public.lounges add column if not exists tier text not null default 'basic'
  check (tier in ('basic','pro','premium','elite'));

-- ── Backfill any pre-existing auth users missing a profile ──────────────────
insert into public.profiles (id, public_id, handle, display_name, role, account_type)
select u.id,
       'USER-' || replace(u.id::text, '-', ''),
       lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '', 'g'))
         || '_' || substr(replace(u.id::text, '-', ''), 1, 4),
       initcap(split_part(u.email, '@', 1)),
       'consumer',
       'consumer'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
