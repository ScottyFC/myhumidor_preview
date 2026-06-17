-- ════════════════════════════════════════════════════════════════════════════
-- Phase 65 — Proper image hierarchy: product → brand → fallback.
-- Brand artwork now lives in its own table instead of being denormalized into
-- each cigar row, so it acts as a true fallback layer beneath a cigar's own
-- (product) image. set_brand_image upserts here (settable by upload or URL).
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.brand_images (
  brand text primary key,
  image_url text not null,
  updated_at timestamptz not null default now()
);
alter table public.brand_images enable row level security;
drop policy if exists "brand images public read" on public.brand_images;
create policy "brand images public read" on public.brand_images for select using (true);

-- Replace the old 3-arg set_brand_image (which wrote into catalog_cigars rows)
-- with a brand-layer upsert. Admin only.
drop function if exists public.set_brand_image(text, text, text);
create or replace function public.set_brand_image(p_brand text, p_url text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')) then
    raise exception 'admins only';
  end if;
  insert into public.brand_images (brand, image_url, updated_at)
  values (p_brand, p_url, now())
  on conflict (brand) do update set image_url = excluded.image_url, updated_at = now();
  return p_url;
end $$;
grant execute on function public.set_brand_image(text, text) to authenticated;
