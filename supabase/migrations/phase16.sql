-- ════════════════════════════════════════════════════════════════════════════
-- Phase 16 — Users can follow lounges (lights up lounge-post notifications).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.lounge_follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lounge_id)
);
alter table public.lounge_follows enable row level security;
create index if not exists lounge_follows_lounge_idx on public.lounge_follows(lounge_id);

drop policy if exists "lounge_follows public read" on public.lounge_follows;
create policy "lounge_follows public read" on public.lounge_follows for select using (true);
drop policy if exists "users follow lounges" on public.lounge_follows;
create policy "users follow lounges" on public.lounge_follows for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users unfollow lounges" on public.lounge_follows;
create policy "users unfollow lounges" on public.lounge_follows for delete to authenticated using (auth.uid() = user_id);

grant all on public.lounge_follows to anon, authenticated, service_role;

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.lounge_follows'; exception when others then null; end;
end $$;
