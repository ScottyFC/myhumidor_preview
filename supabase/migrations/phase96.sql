-- Phase 96 — Badges can target a specific cigar (e.g. "rate our new release").
alter table public.badges add column if not exists target_slug text;
