-- Phase 81 — Fix lounge menu/banner uploads + integrate lounge ownership.
--
-- Two problems this addresses:
--   1. Menu/banner uploads go to the `submissions` Storage bucket, which had NO
--      policy — so Storage denied every insert ("you don't have permission").
--   2. Ownership was granted via `lounges.owner_id` (claim approval, admin assign)
--      but the app reads ownership from `lounge_members`. They were never synced,
--      so owners weren't recognized (e.g. couldn't manage their lounge).

-- ── 1. submissions bucket + policies ────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', true)
on conflict (id) do update set public = true;

drop policy if exists "submissions public read" on storage.objects;
create policy "submissions public read" on storage.objects
  for select using (bucket_id = 'submissions');

drop policy if exists "submissions auth insert" on storage.objects;
create policy "submissions auth insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'submissions');

drop policy if exists "submissions auth update" on storage.objects;
create policy "submissions auth update" on storage.objects
  for update to authenticated using (bucket_id = 'submissions') with check (bucket_id = 'submissions');

-- ── 2. Backfill lounge_members from any existing owner_id ────────────────────
-- Anyone already set as a lounge's owner_id becomes an 'owner' member.
insert into public.lounge_members (lounge_id, user_id, role)
select l.id, l.owner_id, 'owner'
from public.lounges l
where l.owner_id is not null
on conflict (lounge_id, user_id) do update set role = 'owner';

-- ── 3. Keep the two ownership-granting RPCs in sync with lounge_members ──────

-- Claim approval (super-admin): set owner_id + chain AND add the owner member.
create or replace function public.approve_claim_request(p_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare req record; n int := 0; cid uuid; cname text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin') then
    raise exception 'super admins only';
  end if;
  select * into req from public.lounge_claim_requests where id = p_id and status = 'pending';
  if req is null then raise exception 'no pending request'; end if;

  select id into cid from public.chains where owner_id = req.requester_id limit 1;
  if cid is null then
    cname := coalesce(nullif(req.requester_name, ''), 'My') || ' Lounges';
    insert into public.chains (name, owner_id) values (cname, req.requester_id) returning id into cid;
  end if;

  update public.lounges set owner_id = req.requester_id, chain_id = cid where slug = any(req.lounge_slugs);
  get diagnostics n = row_count;

  -- NEW: link the requester as an owner member of each claimed lounge.
  insert into public.lounge_members (lounge_id, user_id, role)
  select l.id, req.requester_id, 'owner'
  from public.lounges l
  where l.slug = any(req.lounge_slugs)
  on conflict (lounge_id, user_id) do update set role = 'owner';

  update public.profiles set account_type = 'retailer',
         role = case when role in ('admin','super_admin') then role else 'lounge_owner' end
   where id = req.requester_id;
  update public.lounge_claim_requests set status = 'approved', reviewed_by = auth.uid() where id = p_id;
  return n;
end $$;
grant execute on function public.approve_claim_request(uuid) to authenticated;

-- Admin assigns an owner by handle: set owner_id AND add the owner member.
create or replace function public.admin_set_lounge_owner(p_slug text, p_handle text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid; nm text;
begin
  if not public._is_admin() then raise exception 'admins only'; end if;
  select id, coalesce(display_name, handle) into uid, nm
  from public.profiles where lower(handle) = lower(p_handle);
  if uid is null then raise exception 'no member with handle %', p_handle; end if;
  update public.lounges set owner_id = uid where slug = p_slug;

  -- NEW: link as owner member.
  insert into public.lounge_members (lounge_id, user_id, role)
  select id, uid, 'owner' from public.lounges where slug = p_slug
  on conflict (lounge_id, user_id) do update set role = 'owner';

  update public.profiles
     set account_type = 'retailer',
         role = case when role in ('admin','super_admin') then role else 'lounge_owner' end
   where id = uid;
  return nm;
end $$;
grant execute on function public.admin_set_lounge_owner(text, text) to authenticated;

-- ── 4. ONE-OFF for your account (b6eb6e4f-3c90-45b6-9a03-c19df4088336) ───────
-- Uncomment and set the slug of the lounge you own, then run:
--
-- update public.lounges set owner_id = 'b6eb6e4f-3c90-45b6-9a03-c19df4088336'
--   where slug = 'your-lounge-slug';
-- insert into public.lounge_members (lounge_id, user_id, role)
--   select id, 'b6eb6e4f-3c90-45b6-9a03-c19df4088336', 'owner'
--   from public.lounges where slug = 'your-lounge-slug'
--   on conflict (lounge_id, user_id) do update set role = 'owner';
-- update public.profiles set account_type = 'retailer',
--        role = case when role in ('admin','super_admin') then role else 'lounge_owner' end
--   where id = 'b6eb6e4f-3c90-45b6-9a03-c19df4088336';
