-- ════════════════════════════════════════════════════════════════════════════
-- Phase 17 — Social engagement (likes + comments) + submission workflow.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Likes (polymorphic: rating | checkin | lounge_post) ─────────────────────
create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
alter table public.likes enable row level security;
create index if not exists likes_target_idx on public.likes(target_type, target_id);

drop policy if exists "likes public read" on public.likes;
create policy "likes public read" on public.likes for select using (true);
drop policy if exists "users like" on public.likes;
create policy "users like" on public.likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users unlike" on public.likes;
create policy "users unlike" on public.likes for delete to authenticated using (auth.uid() = user_id);
grant all on public.likes to anon, authenticated, service_role;

-- ── Comments ─────────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
create index if not exists comments_target_idx on public.comments(target_type, target_id, created_at);

drop policy if exists "comments public read" on public.comments;
create policy "comments public read" on public.comments for select using (true);
drop policy if exists "users comment" on public.comments;
create policy "users comment" on public.comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "users edit own comments" on public.comments;
create policy "users edit own comments" on public.comments for update using (auth.uid() = user_id);
drop policy if exists "users delete own comments" on public.comments;
create policy "users delete own comments" on public.comments for delete using (auth.uid() = user_id);
grant all on public.comments to anon, authenticated, service_role;

-- ── Submissions: slug for dedup + linking posts to a pending cigar ───────────
alter table public.cigar_submissions add column if not exists slug text;
create index if not exists cigar_submissions_slug_idx on public.cigar_submissions(slug);

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.likes'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.comments'; exception when others then null; end;
end $$;

-- ── Verified lounges may push cigars straight to the catalog (auto-approve) ──
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='catalog_cigars') then
    execute 'alter table public.catalog_cigars enable row level security';
    execute 'drop policy if exists "verified lounge ops add catalog cigars" on public.catalog_cigars';
    execute $p$
      create policy "verified lounge ops add catalog cigars" on public.catalog_cigars
      for insert to authenticated with check (
        exists (
          select 1 from public.lounge_members m
          join public.lounges l on l.id = m.lounge_id
          where m.user_id = auth.uid() and l.verified = true
        )
      )
    $p$;
  end if;
end $$;
