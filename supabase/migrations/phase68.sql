-- ════════════════════════════════════════════════════════════════════════════
-- Phase 68 — Notification plumbing: admin broadcast, admin submission alerts,
-- and device-token storage for (future) native push. In-app notifications work
-- immediately via the bell; OS push delivery needs APNs/FCM keys + a sender.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- Notify every admin (used when a member submits a cigar/lounge for review).
create or replace function public.notify_admins(p_type text, p_entity_name text default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; me text;
begin
  select coalesce(display_name, handle, 'A member') into me from profiles where id = auth.uid();
  insert into public.notifications (user_id, actor_id, actor_name, type, entity_name)
  select p.id, auth.uid(), me, p_type, p_entity_name
  from profiles p where p.role in ('admin','super_admin');
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.notify_admins(text, text) to authenticated;

-- Admin → system-wide broadcast to every member.
create or replace function public.broadcast_notification(p_title text)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; me text;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')) then
    raise exception 'admins only';
  end if;
  select coalesce(display_name, 'MyHumidor') into me from profiles where id = auth.uid();
  insert into public.notifications (user_id, actor_id, actor_name, type, entity_name)
  select p.id, auth.uid(), me, 'system', p_title from profiles p;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.broadcast_notification(text) to authenticated;

-- Device tokens for native push (APNs / FCM). Filled by the app on launch.
create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);
alter table public.device_tokens enable row level security;
drop policy if exists "users manage own tokens" on public.device_tokens;
create policy "users manage own tokens" on public.device_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Extra per-type notification prefs (the originals were added in phase15).
alter table public.profiles add column if not exists notify_inventory boolean not null default true;
alter table public.profiles add column if not exists notify_new_lounges boolean not null default true;
alter table public.profiles add column if not exists notify_daily_top boolean not null default true;
alter table public.profiles add column if not exists notify_system boolean not null default true;
