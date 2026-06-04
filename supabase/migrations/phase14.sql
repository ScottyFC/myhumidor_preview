-- ════════════════════════════════════════════════════════════════════════════
-- Phase 14 — exclusive badge tier for Aficionado members.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.badges add column if not exists aficionado_only boolean not null default false;

-- A couple of members-only badges (auto-earned by the criteria parser, but only
-- for Aficionado members). Add artwork later by setting image_url.
insert into public.badges (slug, name, criteria, tier, aficionado_only) values
  ('aficionado-first-pour', 'Aficionado: First Pour', 'Rate your first cigar', 'rare', true),
  ('aficionado-curator',    'Aficionado: Curator',    'Have 25 active cigars in your humidor', 'gold', true),
  ('aficionado-centurion',  'Aficionado: Centurion',  'Log 100 total completed cigar reviews', 'gold', true)
on conflict (slug) do update
  set name = excluded.name, criteria = excluded.criteria, tier = excluded.tier, aficionado_only = true;
