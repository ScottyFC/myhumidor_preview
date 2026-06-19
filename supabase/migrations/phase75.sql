-- ════════════════════════════════════════════════════════════════════════════
-- Phase 75 — Staff RLS enforcement + chain grouping on claim approval.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- id-based permission helper for RLS policies (owner / admin / scoped staff).
create or replace function public.can_manage_lounge_id(p_lounge_id uuid, p_scope text default 'edit')
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.lounges where id = p_lounge_id and owner_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
    or exists (
      select 1 from public.lounge_staff s where s.lounge_id = p_lounge_id and s.user_id = auth.uid()
        and ((p_scope = 'post' and s.can_post) or (p_scope = 'inventory' and s.can_inventory) or (p_scope = 'edit' and s.can_edit))
    );
$$;
grant execute on function public.can_manage_lounge_id(uuid, text) to authenticated;

-- Inventory: owner, admin, or staff with can_inventory.
drop policy if exists "owners manage their lounge inventory" on public.inventory_items;
drop policy if exists "manage lounge inventory" on public.inventory_items;
create policy "manage lounge inventory" on public.inventory_items
  for all using (public.can_manage_lounge_id(lounge_id, 'inventory'))
  with check (public.can_manage_lounge_id(lounge_id, 'inventory'));

-- Posts: existing lounge members/admins, plus staff with can_post.
drop policy if exists "members or admins manage posts" on public.lounge_posts;
drop policy if exists "manage lounge posts" on public.lounge_posts;
create policy "manage lounge posts" on public.lounge_posts
  for all using (public.is_lounge_member(lounge_id) or public.can_manage_lounge_id(lounge_id, 'post'))
  with check (public.is_lounge_member(lounge_id) or public.can_manage_lounge_id(lounge_id, 'post'));

-- Details (hours/food/menu): allow staff with can_edit, not just owner/admin.
create or replace function public.update_lounge_details(
  p_slug text, p_hours_json jsonb default null, p_serves_food boolean default null, p_menu_url text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_lounge(p_slug, 'edit') then
    raise exception 'not authorized for this lounge';
  end if;
  update public.lounges set
    hours_json  = coalesce(p_hours_json, hours_json),
    serves_food = coalesce(p_serves_food, serves_food),
    menu_url    = coalesce(p_menu_url, menu_url)
  where slug = p_slug;
end $$;

-- Claim approval also groups the lounges into a chain so "other locations" works.
create or replace function public.approve_claim_request(p_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare req record; n int := 0; cid uuid; cname text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin') then
    raise exception 'super admins only';
  end if;
  select * into req from public.lounge_claim_requests where id = p_id and status = 'pending';
  if req is null then raise exception 'no pending request'; end if;

  -- Reuse the requester's existing chain or create one.
  select id into cid from public.chains where owner_id = req.requester_id limit 1;
  if cid is null then
    cname := coalesce(nullif(req.requester_name, ''), 'My') || ' Lounges';
    insert into public.chains (name, owner_id) values (cname, req.requester_id) returning id into cid;
  end if;

  update public.lounges set owner_id = req.requester_id, chain_id = cid where slug = any(req.lounge_slugs);
  get diagnostics n = row_count;
  update public.profiles set account_type = 'retailer',
         role = case when role in ('admin','super_admin') then role else 'lounge_owner' end
   where id = req.requester_id;
  update public.lounge_claim_requests set status = 'approved', reviewed_by = auth.uid() where id = p_id;
  return n;
end $$;
