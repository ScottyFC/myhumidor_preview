-- ════════════════════════════════════════════════════════════════════════════
-- Phase 61 — Remove humidor entry by PRIMARY KEY.
-- A delete scoped to (auth.uid(), cigar_id) was still matching 0 rows, so we now
-- delete by the row's own id. This RPC returns the number of rows deleted so the
-- client can detect a 0-row "delete" and tell us instead of failing silently.
-- SECURITY DEFINER + an explicit auth.uid() guard keeps it safe.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.remove_humidor_entry_by_id(p_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  delete from public.humidor_entries
   where id = p_id and user_id = auth.uid();
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.remove_humidor_entry_by_id(uuid) to authenticated;
