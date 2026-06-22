-- ════════════════════════════════════════════════════════════════════════════
-- Phase 80 — Band reference images for the cigar scanner's confirm step.
-- slug → band image URL (Cigar Aficionado / mshanken CDN). Public read.
-- Load the data with cigar-bands-insert.sql after this. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.cigar_bands (
  slug text primary key,
  band_image_url text not null,
  created_at timestamptz not null default now()
);
alter table public.cigar_bands enable row level security;
drop policy if exists "anyone can read cigar bands" on public.cigar_bands;
create policy "anyone can read cigar bands" on public.cigar_bands for select using (true);
-- Writes are done by the SQL loader (runs as owner) / service role.
