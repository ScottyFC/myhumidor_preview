-- Phase 99 — Lounge pre-orders / reservations for upcoming releases.

-- Inventory gains a "coming soon" lifecycle + optional pre-order window.
alter table public.inventory_items add column if not exists coming_soon boolean not null default false;
alter table public.inventory_items add column if not exists release_date date;
alter table public.inventory_items add column if not exists preorder_enabled boolean not null default false;
alter table public.inventory_items add column if not exists preorder_limit int not null default 0;

-- Reservations placed by verified Aficionado users against a coming-soon item.
create table if not exists public.preorders (
  id uuid primary key default gen_random_uuid(),
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  slug text,
  cigar_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  quantity int not null default 1,
  status text not null default 'pending' check (status in ('pending','approved','declined','fulfilled','cancelled')),
  confirmation_number text not null,
  qr_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  fulfilled_at timestamptz
);
create index if not exists preorders_lounge_idx on public.preorders(lounge_id, status);
create index if not exists preorders_user_idx on public.preorders(user_id, status);
create index if not exists preorders_item_idx on public.preorders(inventory_item_id);
create unique index if not exists preorders_qr_idx on public.preorders(qr_token);

alter table public.preorders enable row level security;
-- Users may read their own reservations. All writes + lounge reads go through
-- authorizing service-role routes (verified-aficionado + limit + ownership checks).
drop policy if exists preorders_own_read on public.preorders;
create policy preorders_own_read on public.preorders for select using (user_id = auth.uid());
