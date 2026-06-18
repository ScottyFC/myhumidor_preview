-- ════════════════════════════════════════════════════════════════════════════
-- Phase 69 — Handle derives from DISPLAY NAME (no spaces), not email.
-- The app rejects taken usernames at signup; this keeps the DB consistent and
-- the unique loop remains only as a last-resort safety net. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; h text; n int := 0; dn text; at text; provided text;
begin
  dn := coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), '');
  provided := coalesce(nullif(new.raw_user_meta_data->>'handle', ''), '');
  -- Prefer an explicit handle, then the display name, then the email local-part.
  base := lower(regexp_replace(coalesce(nullif(provided,''), nullif(dn,''), split_part(new.email,'@',1)), '[^a-z0-9]', '', 'g'));
  if base is null or base = '' then base := 'member'; end if;
  h := base;
  while exists (select 1 from public.profiles where handle = h) loop
    n := n + 1; h := base || n::text;
  end loop;
  if dn = '' then dn := initcap(base); end if;
  at := coalesce(nullif(new.raw_user_meta_data->>'account_type', ''), 'consumer');
  insert into public.profiles (id, public_id, handle, display_name, role, account_type)
  values (new.id, 'USER-' || replace(new.id::text, '-', ''), h, dn, 'consumer', at)
  on conflict (id) do nothing;
  return new;
end $$;

-- Case-insensitive username availability check used by the signup form.
create or replace function public.handle_available(p_handle text)
returns boolean language sql security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(handle) = lower(p_handle));
$$;
grant execute on function public.handle_available(text) to anon, authenticated;
