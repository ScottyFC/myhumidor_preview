-- Phase 95 — Brand-created badges (mirror lounge badges via badges.brand_id).
alter table public.badges add column if not exists brand_id uuid references public.brands(id) on delete cascade;
alter table public.badges add column if not exists created_at timestamptz not null default now();
create index if not exists badges_brand_id_idx on public.badges(brand_id);
