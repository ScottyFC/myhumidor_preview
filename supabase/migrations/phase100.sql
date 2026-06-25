-- Phase 100 — Pre-order controls: per-user limits, hold/expiry, cancellations,
-- and cancel-abuse protection.

-- Per-item pre-order controls.
alter table public.inventory_items add column if not exists preorder_per_user_limit int not null default 1;  -- max cigars one user may reserve
alter table public.inventory_items add column if not exists preorder_hold_hours int not null default 0;       -- hours to hold before auto-release (0 = no expiry)

-- Pre-order: lounge message (e.g. cancellation reason) + expiry timestamp.
alter table public.preorders add column if not exists lounge_message text;
alter table public.preorders add column if not exists expires_at timestamptz;

-- Allow an 'expired' state (auto-released holds).
alter table public.preorders drop constraint if exists preorders_status_check;
alter table public.preorders add constraint preorders_status_check
  check (status in ('pending','approved','declined','fulfilled','cancelled','expired'));

-- Cancel-abuse protection: too many self-cancellations temporarily blocks the
-- feature until a super admin reinstates the user.
alter table public.profiles add column if not exists preorder_blocked boolean not null default false;
alter table public.profiles add column if not exists preorder_cancel_count int not null default 0;
