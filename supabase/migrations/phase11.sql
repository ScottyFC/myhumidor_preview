-- ════════════════════════════════════════════════════════════════════════════
-- Phase 11 migration — run once.
--  • Let super admins remove a member's public profile row.
--    (Cascades to that member's ratings / humidor / follows. The underlying
--    auth.users record can only be removed with the service role / dashboard.)
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "super admins delete profiles" on public.profiles;
create policy "super admins delete profiles" on public.profiles
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );
