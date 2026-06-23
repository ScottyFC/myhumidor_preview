-- Phase 83 — Let certified (not just "verified") lounge owners auto-publish cigars.
--
-- Lounge cigar submissions auto-approve into `catalog_cigars` only when the
-- submitter's lounge passes the insert RLS. That policy checked `l.verified = true`,
-- but nothing in the app ever sets `verified` — certification sets `certified` /
-- `cert_tier`. So every real lounge's submission failed the insert and never reached
-- the catalog / front end. Broaden the check to certified OR verified, matching the
-- client's auto-approve gate.

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='catalog_cigars') then
    execute 'drop policy if exists "verified lounge ops add catalog cigars" on public.catalog_cigars';
    execute $p$
      create policy "verified lounge ops add catalog cigars" on public.catalog_cigars
      for insert to authenticated with check (
        exists (
          select 1 from public.lounge_members m
          join public.lounges l on l.id = m.lounge_id
          where m.user_id = auth.uid() and (l.verified = true or l.certified = true)
        )
      );
    $p$;
  end if;
end $$;

-- Optional backfill: if you consider all certified lounges trustworthy, you can also
-- mark them verified so any other `verified`-gated feature lights up too. Uncomment:
-- update public.lounges set verified = true where certified = true and verified = false;
