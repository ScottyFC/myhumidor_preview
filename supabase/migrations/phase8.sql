-- ════════════════════════════════════════════════════════════════════════════
-- Phase 8 migration — run once in the SQL Editor.
--  • lounge_members: owner/manager/staff levels per lounge
--  • lounge_claims: claim → admin approval → ownership
--  • audit_events: change history for super admins + lounge admins
--  • inventory_items / lounge_posts / lounges RLS tightened to members + admins
-- ════════════════════════════════════════════════════════════════════════════

-- ── lounge_members (profile levels) ─────────────────────────────────────────
create table if not exists public.lounge_members (
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'manager' check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (lounge_id, user_id)
);
alter table public.lounge_members enable row level security;

drop policy if exists "members see own memberships" on public.lounge_members;
create policy "members see own memberships" on public.lounge_members
  for select using (auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

drop policy if exists "admins manage memberships" on public.lounge_members;
create policy "admins manage memberships" on public.lounge_members
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

grant all on public.lounge_members to anon, authenticated, service_role;

-- helper: is the current user a member of a given lounge?
create or replace function public.is_lounge_member(l uuid) returns boolean
language sql security definer stable as $$
  select exists (select 1 from public.lounge_members m where m.lounge_id = l and m.user_id = auth.uid());
$$;

-- ── lounge_claims ───────────────────────────────────────────────────────────
create table if not exists public.lounge_claims (
  id uuid primary key default uuid_generate_v4(),
  lounge_id uuid references public.lounges(id) on delete cascade,
  lounge_slug text,
  lounge_name text,
  user_id uuid references public.profiles(id) on delete set null,
  claimant_name text,
  role_requested text,
  email text,
  phone text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.lounge_claims enable row level security;

drop policy if exists "users submit claims" on public.lounge_claims;
create policy "users submit claims" on public.lounge_claims
  for insert with check (auth.uid() = user_id);

drop policy if exists "users see own claims" on public.lounge_claims;
create policy "users see own claims" on public.lounge_claims
  for select using (auth.uid() = user_id);

drop policy if exists "admins manage claims" on public.lounge_claims;
create policy "admins manage claims" on public.lounge_claims
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

grant all on public.lounge_claims to anon, authenticated, service_role;

-- ── audit_events (change history) ───────────────────────────────────────────
create table if not exists public.audit_events (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  entity_type text,
  entity_id text,
  entity_name text,
  lounge_id uuid references public.lounges(id) on delete set null,
  meta jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_events enable row level security;
create index if not exists audit_recent_idx on public.audit_events(created_at desc);
create index if not exists audit_lounge_idx on public.audit_events(lounge_id);

drop policy if exists "authenticated record events" on public.audit_events;
create policy "authenticated record events" on public.audit_events
  for insert with check (auth.uid() = actor_id);

drop policy if exists "admins read events" on public.audit_events;
create policy "admins read events" on public.audit_events
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

drop policy if exists "lounge members read their events" on public.audit_events;
create policy "lounge members read their events" on public.audit_events
  for select using (lounge_id is not null and public.is_lounge_member(lounge_id));

grant all on public.audit_events to anon, authenticated, service_role;

-- ── tighten inventory + posts + lounge updates to members/admins ────────────
drop policy if exists "authenticated manage inventory" on public.inventory_items;
drop policy if exists "members or admins manage inventory" on public.inventory_items;
create policy "members or admins manage inventory" on public.inventory_items
  for all using (
    public.is_lounge_member(lounge_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

drop policy if exists "members or admins manage posts" on public.lounge_posts;
create policy "members or admins manage posts" on public.lounge_posts
  for all using (
    public.is_lounge_member(lounge_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin'))
  );

drop policy if exists "members update their lounge" on public.lounges;
create policy "members update their lounge" on public.lounges
  for update using (public.is_lounge_member(id));

-- realtime for live logs
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.audit_events'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.lounge_claims'; exception when others then null; end;
end $$;
