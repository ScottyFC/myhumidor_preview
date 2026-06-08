-- ════════════════════════════════════════════════════════════════════════════
-- Phase 18 — Lounge business accounts: credits + verify/certify requests.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Every lounge starts with 1,000 credits (grows later via TV viewing time) ──
alter table public.lounges add column if not exists credits integer not null default 1000;
-- Backfill existing lounges that predate the column to the starting balance.
update public.lounges set credits = 1000 where credits is null or credits = 0;

-- ── Verification / certification requests reuse lounge_submissions ────────────
-- A lounge owner submits verifiable business details for admin review.
alter table public.lounge_submissions add column if not exists business_license text;
alter table public.lounge_submissions add column if not exists contact_name text;
alter table public.lounge_submissions add column if not exists kind text not null default 'new'
  check (kind in ('new','verify'));
