-- Phase 85 — Brand onboarding state.
-- Stores which onboarding steps a brand has acknowledged/dismissed. Auto-detectable
-- steps (logo, banner, bio, first product, first post) are derived from real data;
-- this column only holds manual acks + the dismissed flag. Brand members can already
-- update their brands row (phase84 "brands members update"), so no new RPC is needed.
alter table public.brands add column if not exists onboarding jsonb not null default '{}'::jsonb;
