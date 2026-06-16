-- ════════════════════════════════════════════════════════════════════════════
-- Phase 57 — Fix: approving a cigar submission failed with
--   "null value in column \"id\" of relation \"catalog_cigars\""
-- catalog_cigars.id was a uuid PK with NO default (every other table has one),
-- so any insert that didn't explicitly supply an id failed. Give it a default
-- so the database always fills it. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.catalog_cigars alter column id set default gen_random_uuid();
