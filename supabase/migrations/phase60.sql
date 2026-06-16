-- ════════════════════════════════════════════════════════════════════════════
-- Phase 60 — Reliable humidor removal.
-- Removing a cigar wasn't persisting (it reappeared after refresh), which means
-- the live DELETE was matching 0 rows under RLS. This RPC deletes the current
-- user's entry with SECURITY DEFINER, so it works regardless of how the table's
-- RLS delete policy is configured. Also (re)asserts a correct delete policy.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- Make sure a self-delete policy exists (covers the direct-delete fallback too).
drop policy if exists "users delete own humidor" on public.humidor_entries;
create policy "users delete own humidor" on public.humidor_entries
  for delete using (auth.uid() = user_id);

create or replace function public.remove_humidor_entry(p_cigar_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  delete from public.humidor_entries
   where user_id = auth.uid() and cigar_id = p_cigar_id;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.remove_humidor_entry(uuid) to authenticated;
