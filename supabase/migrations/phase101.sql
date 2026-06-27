-- Phase 101 — Make wholesale "boxes available" an OPTIONAL cap.
-- Before this, the column defaulted to 0 and the order route treated 0 as
-- "out of stock", so any listing a brand added without explicitly setting a
-- number was unorderable — a lounge couldn't order a brand's other cigars.
-- New semantics: NULL = no cap (orderable, unlimited), 0 = sold out, >0 = capped.

alter table public.brand_wholesale_listings alter column boxes_available drop default;
alter table public.brand_wholesale_listings alter column boxes_available drop not null;
-- The feature is new; treat the old default 0 as "no cap" so existing listings
-- become orderable rather than silently sold out.
update public.brand_wholesale_listings set boxes_available = null where boxes_available = 0;
