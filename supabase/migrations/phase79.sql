-- ════════════════════════════════════════════════════════════════════════════
-- Phase 79 — Cached AI cigar descriptions. Generated once per cigar and stored
-- so we don't re-call the model on every view. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.cigar_descriptions (
  slug text primary key,
  description text not null,
  created_at timestamptz not null default now()
);
alter table public.cigar_descriptions enable row level security;
drop policy if exists "anyone can read cigar descriptions" on public.cigar_descriptions;
create policy "anyone can read cigar descriptions" on public.cigar_descriptions for select using (true);
-- Writes happen via the service role in the API route (bypasses RLS).
