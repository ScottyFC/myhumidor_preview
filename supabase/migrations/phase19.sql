-- ════════════════════════════════════════════════════════════════════════════
-- Phase 19 — Fix: approved cigar submissions stayed in the pending queue.
--
-- The cigar_submissions admin policy checked `role = 'admin'`, but the platform
-- super admin has role `super_admin` (set in phase10). So the approval UPDATE
-- matched 0 rows under RLS — the row reverted to pending on the next refresh.
-- Every other table already uses `in ('admin','super_admin')`; this aligns
-- cigar_submissions with that.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "admins review submissions" on public.cigar_submissions;
create policy "admins review submissions" on public.cigar_submissions
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','super_admin')
    )
  );
