-- ════════════════════════════════════════════════════════════════════════════
-- Phase 24 — Rename lounge/business account type to 'retailer'.
-- Widens the account_type check, migrates existing rows, and normalizes the
-- signup trigger so metadata 'lounge' (legacy) is stored as 'retailer'.
-- ════════════════════════════════════════════════════════════════════════════

-- Widen the constraint (keep 'lounge' transiently so the migrate step can't trip).
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type in ('consumer','retailer','lounge'));

-- Migrate existing business accounts.
update public.profiles set account_type = 'retailer' where account_type = 'lounge';

-- Re-tighten to the final set.
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type in ('consumer','retailer'));

-- Signup trigger: normalize 'lounge' → 'retailer' from metadata, never throw.
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
  if at = 'lounge' then at := 'retailer'; end if;
  if at not in ('consumer','retailer') then at := 'consumer'; end if;
  insert into public.profiles (id, public_id, handle, display_name, role, account_type)
  values (new.id, 'USER-' || replace(new.id::text, '-', ''), h, dn, 'consumer', at)
  on conflict (id) do nothing;
  return new;
end $$;
