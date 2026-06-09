-- ════════════════════════════════════════════════════════════════════════════
-- Phase 22 — Fix: "lounge_submissions_submitted_by_fkey" violation.
--
-- submitted_by → profiles(id). The error means a signed-in user has no profiles
-- row (the signup trigger never fired or failed for that account). Since ratings,
-- collection, follows, and submissions all FK to profiles, we (1) re-assert the
-- collision-safe signup trigger, and (2) backfill a profile for every auth user
-- that's missing one. Idempotent — safe to run repeatedly.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Re-assert the signup trigger (same logic as phase10; never throws).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare base text; h text; n int := 0; dn text; at text;
begin
  base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if base is null or base = '' then base := 'member'; end if;
  h := base;
  while exists (select 1 from public.profiles where handle = h) loop
    n := n + 1; h := base || n::text;
  end loop;
  dn := coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), initcap(base));
  at := coalesce(nullif(new.raw_user_meta_data->>'account_type', ''), 'consumer');
  insert into public.profiles (id, public_id, handle, display_name, role, account_type)
  values (new.id, 'USER-' || replace(new.id::text, '-', ''), h, dn, 'consumer', at)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Backfill profiles for any existing auth users that don't have one.
do $$
declare
  u record;
  base text; h text; n int; dn text; at text;
begin
  for u in
    select au.id, au.email, au.raw_user_meta_data as meta
    from auth.users au
    left join public.profiles p on p.id = au.id
    where p.id is null
  loop
    base := lower(regexp_replace(split_part(coalesce(u.email, ''), '@', 1), '[^a-z0-9_]', '', 'g'));
    if base is null or base = '' then base := 'member'; end if;
    h := base; n := 0;
    while exists (select 1 from public.profiles where handle = h) loop
      n := n + 1; h := base || n::text;
    end loop;
    dn := coalesce(nullif(u.meta->>'display_name', ''), initcap(base));
    at := coalesce(nullif(u.meta->>'account_type', ''), 'consumer');
    insert into public.profiles (id, public_id, handle, display_name, role, account_type)
    values (u.id, 'USER-' || replace(u.id::text, '-', ''), h, dn, 'consumer', at)
    on conflict (id) do nothing;
  end loop;
end $$;

-- Quick check (optional): should return 0.
-- select count(*) from auth.users au left join public.profiles p on p.id = au.id where p.id is null;
