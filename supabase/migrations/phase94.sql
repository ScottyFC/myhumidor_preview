-- Phase 94 — Users follow brands; followers get notified on posts/inventory.
create table if not exists public.brand_follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, brand_id)
);
alter table public.brand_follows enable row level security;
do $$ begin
  drop policy if exists brand_follows_read on public.brand_follows;
  create policy brand_follows_read on public.brand_follows for select using (true);
  drop policy if exists brand_follows_insert on public.brand_follows;
  create policy brand_follows_insert on public.brand_follows for insert with check (auth.uid() = user_id);
  drop policy if exists brand_follows_delete on public.brand_follows;
  create policy brand_follows_delete on public.brand_follows for delete using (auth.uid() = user_id);
end $$;
create index if not exists brand_follows_brand_idx on public.brand_follows(brand_id);
