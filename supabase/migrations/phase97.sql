-- Phase 97 — Cigar broker scaffolding: wholesale box listings, orders, and a
-- lounge<->brand messaging system. Brands use custom cookie auth (service-role
-- routes), lounges are Supabase users that own a lounge (lounges.owner_id), so
-- these tables are RLS-locked and all access goes through authorizing server
-- routes — except wholesale_listings, which is publicly readable when active.

-- 1) Brands sell cigars by the box.
create table if not exists public.brand_wholesale_listings (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  slug text,                       -- optional link to a catalog cigar
  cigar_name text not null,
  vitola text,
  cigars_per_box int not null default 20,
  price_per_box_cents int not null,
  boxes_available int not null default 0,
  moq_boxes int not null default 1,  -- minimum order quantity, in boxes
  status text not null default 'active' check (status in ('active','paused')),
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists bwl_brand_idx on public.brand_wholesale_listings(brand_id);
create index if not exists bwl_status_idx on public.brand_wholesale_listings(status);
alter table public.brand_wholesale_listings enable row level security;
drop policy if exists bwl_public_read on public.brand_wholesale_listings;
create policy bwl_public_read on public.brand_wholesale_listings for select using (status = 'active');

-- 2) Orders a lounge places with a brand.
create table if not exists public.broker_orders (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  status text not null default 'placed' check (status in ('placed','accepted','declined','shipped','cancelled')),
  total_cents int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bo_brand_idx on public.broker_orders(brand_id);
create index if not exists bo_lounge_idx on public.broker_orders(lounge_id);
alter table public.broker_orders enable row level security; -- access via server routes only

create table if not exists public.broker_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.broker_orders(id) on delete cascade,
  listing_id uuid references public.brand_wholesale_listings(id) on delete set null,
  cigar_name text not null,
  boxes int not null,
  price_per_box_cents int not null
);
create index if not exists boi_order_idx on public.broker_order_items(order_id);
alter table public.broker_order_items enable row level security;

-- 3) One message thread per (brand, lounge); messages within.
create table if not exists public.broker_threads (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (brand_id, lounge_id)
);
alter table public.broker_threads enable row level security;

create table if not exists public.broker_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.broker_threads(id) on delete cascade,
  sender_type text not null check (sender_type in ('brand','lounge')),
  sender_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists bm_thread_idx on public.broker_messages(thread_id, created_at);
alter table public.broker_messages enable row level security;
