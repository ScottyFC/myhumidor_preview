-- Phase 93 — Brand self-serve catalog: ownership + lifecycle status on catalog_cigars.
alter table public.catalog_cigars add column if not exists brand_id uuid references public.brands(id) on delete cascade;
alter table public.catalog_cigars add column if not exists status text not null default 'available'
  check (status in ('available','coming_soon','discontinued'));
alter table public.catalog_cigars alter column id set default gen_random_uuid();
create index if not exists catalog_cigars_brand_id_idx on public.catalog_cigars(brand_id);
