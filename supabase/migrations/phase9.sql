-- ════════════════════════════════════════════════════════════════════════════
-- Phase 9 migration — run once.
--  • Submitting a lounge can also claim ownership, so submit + verify + claim
--    are one flow: approving an ownership submission verifies the lounge and
--    makes the submitter its owner.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.lounge_submissions add column if not exists claims_ownership boolean not null default false;
alter table public.lounge_submissions add column if not exists role_requested text;
