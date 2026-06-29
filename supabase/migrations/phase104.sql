-- Phase 104 — defense-in-depth: enable RLS on the public reference table `chains`.
-- `chains` holds retailer/chain reference data (read-only public). Enabling RLS
-- with a read-only policy ensures access is governed by policy, not table grants.
alter table public.chains enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chains' and policyname='chains_public_read') then
    create policy chains_public_read on public.chains for select using (true);
  end if;
end $$;
