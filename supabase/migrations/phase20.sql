-- ════════════════════════════════════════════════════════════════════════════
-- Phase 20 — CigarTV Android TV app backbone: devices, stream credits, geo.
--
-- Economics (single source of truth, see record_stream_heartbeat):
--   • 10 credits / hour / active TV   → 360 streamed seconds == 1 credit
--   • daily cap 120 credits / TV / day (~12 hours)
-- Credits are granted ONLY by the SECURITY DEFINER RPC below, so a client can
-- never write its own balance.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Registered screens (a TV that streams, or a screen showing the menu) ─────
create table if not exists public.lounge_devices (
  id uuid primary key default uuid_generate_v4(),
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  name text not null default 'Main TV',
  kind text not null default 'tv' check (kind in ('tv','menu')),
  lat double precision,
  lng double precision,
  last_seen timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists lounge_devices_lounge_idx on public.lounge_devices(lounge_id);
alter table public.lounge_devices enable row level security;

-- Members of the lounge (owner/manager/staff) manage that lounge's devices.
drop policy if exists "members manage devices" on public.lounge_devices;
create policy "members manage devices" on public.lounge_devices
  for all using (
    exists (select 1 from public.lounge_members m where m.lounge_id = lounge_devices.lounge_id and m.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  )
  with check (
    exists (select 1 from public.lounge_members m where m.lounge_id = lounge_devices.lounge_id and m.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );
grant all on public.lounge_devices to anon, authenticated, service_role;

-- ── Per-device, per-day accrual (enforces the daily cap) ─────────────────────
create table if not exists public.device_credit_daily (
  device_id uuid not null references public.lounge_devices(id) on delete cascade,
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  day date not null default current_date,
  seconds integer not null default 0,
  credits integer not null default 0,
  primary key (device_id, day)
);
alter table public.device_credit_daily enable row level security;
drop policy if exists "members read accrual" on public.device_credit_daily;
create policy "members read accrual" on public.device_credit_daily
  for select using (
    exists (select 1 from public.lounge_members m where m.lounge_id = device_credit_daily.lounge_id and m.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );
grant all on public.device_credit_daily to anon, authenticated, service_role;

-- ── Credit ledger (audit of every grant) ─────────────────────────────────────
-- NOTE: schema.sql may already define credit_ledger with columns (delta, reason,
-- recorded_at). We match that shape on fresh installs and only ADD what's new,
-- so this is safe whether or not the table already exists.
create table if not exists public.credit_ledger (
  id uuid primary key default uuid_generate_v4(),
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  delta int not null,
  reason text not null default 'stream',
  recorded_at timestamptz not null default now()
);
alter table public.credit_ledger add column if not exists device_id uuid references public.lounge_devices(id) on delete set null;
create index if not exists credit_lounge_idx on public.credit_ledger(lounge_id, recorded_at desc);
alter table public.credit_ledger enable row level security;
drop policy if exists "members read ledger" on public.credit_ledger;
create policy "members read ledger" on public.credit_ledger
  for select using (
    exists (select 1 from public.lounge_members m where m.lounge_id = credit_ledger.lounge_id and m.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );
grant all on public.credit_ledger to anon, authenticated, service_role;

-- ── Register a device (the TV calls this after the lounge signs in) ──────────
create or replace function public.register_lounge_device(
  p_lounge uuid, p_name text, p_kind text default 'tv',
  p_lat double precision default null, p_lng double precision default null
) returns public.lounge_devices
language plpgsql security definer set search_path = public as $$
declare d public.lounge_devices;
begin
  if not exists (select 1 from lounge_members m where m.lounge_id = p_lounge and m.user_id = auth.uid()) then
    raise exception 'not a member of this lounge';
  end if;
  insert into lounge_devices (lounge_id, name, kind, lat, lng, created_by, last_seen)
  values (p_lounge, coalesce(nullif(p_name,''),'Main TV'),
          case when p_kind in ('tv','menu') then p_kind else 'tv' end,
          p_lat, p_lng, auth.uid(), now())
  returning * into d;
  return d;
end $$;
grant execute on function public.register_lounge_device(uuid, text, text, double precision, double precision) to authenticated;

-- ── Stream heartbeat → award credits (rate + daily cap enforced here) ────────
create or replace function public.record_stream_heartbeat(
  p_device uuid, p_seconds integer,
  p_lat double precision default null, p_lng double precision default null
) returns table (lounge_credits integer, today_credits integer, daily_cap integer)
language plpgsql security definer set search_path = public as $$
declare
  v_lounge uuid;
  v_rate_seconds constant integer := 360;  -- 10 credits/hour
  v_daily_cap   constant integer := 120;   -- ~12 hours/day per TV
  v_secs integer;
  v_row device_credit_daily;
  v_new_credits integer;
  v_delta integer;
  v_balance integer;
begin
  select lounge_id into v_lounge from lounge_devices where id = p_device;
  if v_lounge is null then raise exception 'unknown device'; end if;
  if not exists (select 1 from lounge_members m where m.lounge_id = v_lounge and m.user_id = auth.uid()) then
    raise exception 'not a member of this lounge';
  end if;

  -- clamp a single report to at most ~2 minutes to bound spoofing
  v_secs := greatest(0, least(coalesce(p_seconds, 0), 120));

  insert into device_credit_daily (device_id, lounge_id, day, seconds, credits)
  values (p_device, v_lounge, current_date, 0, 0)
  on conflict (device_id, day) do nothing;

  select * into v_row from device_credit_daily where device_id = p_device and day = current_date for update;

  update device_credit_daily set seconds = seconds + v_secs
    where device_id = p_device and day = current_date
    returning * into v_row;

  v_new_credits := least(v_row.seconds / v_rate_seconds, v_daily_cap);
  v_delta := v_new_credits - v_row.credits;

  if v_delta > 0 then
    update device_credit_daily set credits = v_new_credits where device_id = p_device and day = current_date;
    update lounges set credits = coalesce(credits,0) + v_delta where id = v_lounge;
    insert into credit_ledger (lounge_id, device_id, delta, reason) values (v_lounge, p_device, v_delta, 'stream');
  end if;

  update lounge_devices set last_seen = now(),
    lat = coalesce(p_lat, lat), lng = coalesce(p_lng, lng)
    where id = p_device;

  select credits into v_balance from lounges where id = v_lounge;
  return query select v_balance, v_new_credits, v_daily_cap;
end $$;
grant execute on function public.record_stream_heartbeat(uuid, integer, double precision, double precision) to authenticated;

-- ── Ad-targeting view: where are lounges actively streaming right now ────────
create or replace view public.active_stream_locations as
select l.id as lounge_id, l.slug, l.name, l.city, l.state,
       coalesce(d.lat, l.lat) as lat, coalesce(d.lng, l.lng) as lng,
       d.id as device_id, d.last_seen
from public.lounge_devices d
join public.lounges l on l.id = d.lounge_id
where d.kind = 'tv' and d.last_seen > now() - interval '5 minutes';
grant select on public.active_stream_locations to authenticated, service_role;
