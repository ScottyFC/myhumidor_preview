-- ════════════════════════════════════════════════════════════════════════════
-- Phase 12 migration — run once. Adapts the EXISTING badges table
-- (id, slug, name, criteria, tier) rather than recreating it.
--  • Storage RLS for `avatars` (fixes profile photos + lounge logos not saving)
--  • Adds image_url + lounge_id to badges, attaches the uploaded artwork
--  • user_badges (earned) + RLS, incl. Premium lounges creating badges
-- ════════════════════════════════════════════════════════════════════════════

-- ── Storage: avatars bucket (THIS is why photos weren't saving) ─────────────
update storage.buckets set public = true where id = 'avatars';

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "avatars auth insert" on storage.objects;
create policy "avatars auth insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');
drop policy if exists "avatars auth update" on storage.objects;
create policy "avatars auth update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');
drop policy if exists "avatars auth delete" on storage.objects;
create policy "avatars auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars');

-- ── Extend the existing badges table ────────────────────────────────────────
alter table public.badges add column if not exists image_url text;
alter table public.badges add column if not exists lounge_id uuid references public.lounges(id) on delete cascade;

alter table public.badges enable row level security;

drop policy if exists "badges public read" on public.badges;
create policy "badges public read" on public.badges for select using (true);

drop policy if exists "admins manage badges" on public.badges;
create policy "admins manage badges" on public.badges
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')));

drop policy if exists "premium lounges create badges" on public.badges;
create policy "premium lounges create badges" on public.badges
  for insert to authenticated with check (
    lounge_id is not null
    and exists (
      select 1 from public.lounges l
      join public.lounge_members m on m.lounge_id = l.id
      where l.id = badges.lounge_id and m.user_id = auth.uid() and l.tier in ('premium','elite')
    )
  );

grant all on public.badges to anon, authenticated, service_role;

-- Attach the uploaded artwork to the matching badges (assets in /public/badges).
update public.badges set image_url = '/badges/century-smoke.png'            where slug = 'century-smoke';
update public.badges set image_url = '/badges/connecticut-shade-seeker.png' where slug = 'connecticut-shade-seeker';
update public.badges set image_url = '/badges/esteli-explorer.png'          where slug = 'estelí-explorer';
update public.badges set image_url = '/badges/humidor-stocked.png'          where slug = 'humidor-stocked';
update public.badges set image_url = '/badges/opus-club.png'                where slug = 'opus-club';
update public.badges set image_url = '/badges/palate-pioneer.png'           where slug = 'palate-pioneer';
update public.badges set image_url = '/badges/unicorn-chaser.png'           where slug = 'unicorn-chaser';

-- ── Earned badges ───────────────────────────────────────────────────────────
create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table public.user_badges enable row level security;

drop policy if exists "user_badges public read" on public.user_badges;
create policy "user_badges public read" on public.user_badges for select using (true);
drop policy if exists "users earn own badges" on public.user_badges;
create policy "users earn own badges" on public.user_badges
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users drop own badges" on public.user_badges;
create policy "users drop own badges" on public.user_badges
  for delete to authenticated using (auth.uid() = user_id);

grant all on public.user_badges to anon, authenticated, service_role;

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.user_badges'; exception when others then null; end;
end $$;
