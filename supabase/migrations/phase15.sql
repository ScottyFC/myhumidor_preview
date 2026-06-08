-- ════════════════════════════════════════════════════════════════════════════
-- Phase 15 — Check-ins, notifications, social links, follow suggestions.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Check-ins ───────────────────────────────────────────────────────────────
create table if not exists public.check_ins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cigar_slug text,
  cigar_brand text,
  cigar_name text,
  lounge_id uuid references public.lounges(id) on delete set null,
  lounge_slug text,
  lounge_name text,
  rating numeric,
  review text,
  photo_url text,
  created_at timestamptz not null default now()
);
alter table public.check_ins enable row level security;
create index if not exists check_ins_lounge_idx on public.check_ins(lounge_id, created_at desc);
create index if not exists check_ins_user_idx on public.check_ins(user_id, created_at desc);

drop policy if exists "check_ins public read" on public.check_ins;
create policy "check_ins public read" on public.check_ins for select using (true);
drop policy if exists "users create own check_ins" on public.check_ins;
create policy "users create own check_ins" on public.check_ins for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users delete own check_ins" on public.check_ins;
create policy "users delete own check_ins" on public.check_ins for delete to authenticated using (auth.uid() = user_id);
grant all on public.check_ins to anon, authenticated, service_role;

-- ── Notifications ─────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,  -- recipient
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  type text not null,                 -- follow | like | comment | lounge_post | check_in
  entity_type text,
  entity_id text,
  entity_name text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "actors create notifications" on public.notifications;
create policy "actors create notifications" on public.notifications for insert to authenticated with check (auth.uid() = actor_id);
drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications for update using (auth.uid() = user_id);
drop policy if exists "users delete own notifications" on public.notifications;
create policy "users delete own notifications" on public.notifications for delete using (auth.uid() = user_id);
grant all on public.notifications to anon, authenticated, service_role;

-- ── Notification settings + social links ─────────────────────────────────────
alter table public.profiles add column if not exists notify_follows  boolean not null default true;
alter table public.profiles add column if not exists notify_likes    boolean not null default true;
alter table public.profiles add column if not exists notify_comments boolean not null default true;
alter table public.profiles add column if not exists notify_lounges  boolean not null default true;
alter table public.profiles add column if not exists socials jsonb;   -- {instagram,x,facebook,tiktok,youtube,website}
alter table public.lounges  add column if not exists socials jsonb;

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.notifications'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.check_ins'; exception when others then null; end;
end $$;
