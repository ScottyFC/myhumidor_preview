-- ════════════════════════════════════════════════════════════════════════════
-- Phase 59 — Ratings become append-only.
-- A user may rate the same cigar again later; each is a NEW rating (not an edit).
-- Drop the one-row-per-(user,cigar) unique constraint so multiple ratings can
-- coexist. Ratings can only be added or removed, never amended. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.ratings drop constraint if exists ratings_user_id_cigar_id_key;

-- (Some installs named it differently; drop any unique on exactly these cols.)
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.ratings'::regclass and contype = 'u'
      and conkey = (
        select array_agg(attnum order by attnum) from pg_attribute
        where attrelid = 'public.ratings'::regclass and attname in ('user_id','cigar_id')
      )
  loop
    execute format('alter table public.ratings drop constraint %I', c);
  end loop;
end $$;

create index if not exists ratings_user_cigar_idx on public.ratings (user_id, cigar_id);
