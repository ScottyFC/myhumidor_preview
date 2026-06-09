-- ════════════════════════════════════════════════════════════════════════════
-- Phase 26 — Fix lounge_submissions_submitted_by_fkey violations.
-- Root cause: some accounts have no public.profiles row (the signup trigger
-- never fired for them — e.g. created before account_type allowed 'retailer').
-- Fix: (1) let users self-insert their own profile, (2) backfill everyone
-- missing one now, (3) re-assert the trigger so it can't silently fail.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Allow a signed-in user to create their own profile row (id must be theirs).
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 2) Backfill profiles for any auth.users that don't have one yet.
insert into public.profiles (id, public_id, handle, display_name, role, account_type)
select
  u.id,
  'USER-' || replace(u.id::text, '-', ''),
  lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9_]', '', 'g'))
    || '_' || substr(replace(u.id::text, '-', ''), 1, 8),
  coalesce(
    nullif(u.raw_user_meta_data->>'display_name', ''),
    nullif(u.raw_user_meta_data->>'lounge_name', ''),
    split_part(u.email, '@', 1),
    'Member'
  ),
  'consumer',
  case when u.raw_user_meta_data->>'account_type' in ('retailer', 'lounge')
       then 'retailer' else 'consumer' end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 3) Re-assert the signup trigger (clamps account_type; never throws on dup).
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
  dn := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'lounge_name', ''),
    initcap(base)
  );
  at := coalesce(nullif(new.raw_user_meta_data->>'account_type', ''), 'consumer');
  if at = 'lounge' then at := 'retailer'; end if;
  if at not in ('consumer','retailer') then at := 'consumer'; end if;
  insert into public.profiles (id, public_id, handle, display_name, role, account_type)
  values (new.id, 'USER-' || replace(new.id::text, '-', ''), h, dn, 'consumer', at)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
