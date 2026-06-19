-- ════════════════════════════════════════════════════════════════════════════
-- Phase 76 — Remove logo.dev. Purge any cached/populated logo.dev image URLs so
-- those brands/cigars fall back to product images, admin uploads, or a monogram.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════
delete from public.brand_images where image_url ilike '%logo.dev%';
update public.catalog_cigars   set image_url = null where image_url ilike '%logo.dev%';
update public.catalog_overrides set image_url = null where image_url ilike '%logo.dev%';
