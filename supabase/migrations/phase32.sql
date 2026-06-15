-- ════════════════════════════════════════════════════════════════════════════
-- Phase 32 — Smoking vs keeping, review photos + lounge check-in, brand images.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Humidor entries can now also be 'smoked' (rated → moved out of humidor).
alter table public.humidor_entries drop constraint if exists humidor_entries_status_check;
alter table public.humidor_entries add constraint humidor_entries_status_check
  check (status in ('humidor','wishlist','smoked'));

-- 2) Ratings carry an optional photo + the lounge the user checked into.
alter table public.ratings add column if not exists photo_url text;
alter table public.ratings add column if not exists lounge_slug text;
create index if not exists ratings_slug_photo_idx on public.ratings (slug) where photo_url is not null;

-- 3) Admins set a brand's artwork from a cigar page — applies to every catalog
--    cigar of that brand that doesn't already have an image (plus a forced one).
create or replace function public.set_brand_image(p_brand text, p_url text, p_slug text default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')) then
    raise exception 'admins only';
  end if;
  update catalog_cigars set image_url = p_url
   where brand = p_brand and (image_url is null or image_url = '' or slug = p_slug);
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.set_brand_image(text, text, text) to authenticated;
