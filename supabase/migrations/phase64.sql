-- ════════════════════════════════════════════════════════════════════════════
-- Phase 64 — Admins set/overwrite a single cigar's image (the cigar or label
-- photo), as opposed to the brand-wide set_brand_image. SECURITY DEFINER +
-- admin check. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.set_cigar_image(p_slug text, p_url text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','super_admin')) then
    raise exception 'admins only';
  end if;
  update catalog_cigars set image_url = p_url where slug = p_slug;  -- overwrites existing
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.set_cigar_image(text, text) to authenticated;
