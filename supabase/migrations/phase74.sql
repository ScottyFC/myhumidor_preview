-- ════════════════════════════════════════════════════════════════════════════
-- Phase 74 — Chains, lounge staff (access levels), and bulk-claim requests.
-- Certified lounges only (enforced in RPCs). Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- Chains: group multiple lounges under one owner.
create table if not exists public.chains (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.lounges add column if not exists chain_id uuid references public.chains(id) on delete set null;
create index if not exists lounges_chain_idx on public.lounges(chain_id);

-- Staff: members an owner grants scoped access to a lounge.
create table if not exists public.lounge_staff (
  lounge_id uuid not null references public.lounges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  can_post boolean not null default true,
  can_inventory boolean not null default false,
  can_edit boolean not null default false,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (lounge_id, user_id)
);
alter table public.lounge_staff enable row level security;
drop policy if exists "staff visible to lounge owner+staff" on public.lounge_staff;
create policy "staff visible to lounge owner+staff" on public.lounge_staff for select using (
  user_id = auth.uid()
  or exists (select 1 from public.lounges l where l.id = lounge_id and l.owner_id = auth.uid())
  or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
);

-- Bulk-claim requests → reviewed in the SUPER-ADMIN panel.
create table if not exists public.lounge_claim_requests (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_name text,
  lounge_slugs text[] not null default '{}',
  note text,
  status text not null default 'pending',  -- pending | approved | rejected
  reviewed_by uuid,
  created_at timestamptz not null default now()
);
alter table public.lounge_claim_requests enable row level security;
drop policy if exists "requester or admins read claims" on public.lounge_claim_requests;
create policy "requester or admins read claims" on public.lounge_claim_requests for select using (
  requester_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
);
drop policy if exists "members create their own claim" on public.lounge_claim_requests;
create policy "members create their own claim" on public.lounge_claim_requests for insert with check (requester_id = auth.uid());

-- Helper: may the caller manage this lounge (owner, admin, or scoped staff)?
create or replace function public.can_manage_lounge(p_slug text, p_scope text default 'edit')
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.lounges l where l.slug = p_slug and l.owner_id = auth.uid()
  ) or exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin')
  ) or exists (
    select 1 from public.lounge_staff s join public.lounges l on l.id = s.lounge_id
    where l.slug = p_slug and s.user_id = auth.uid()
      and (p_scope = 'post' and s.can_post or p_scope = 'inventory' and s.can_inventory or p_scope = 'edit' and s.can_edit)
  );
$$;
grant execute on function public.can_manage_lounge(text, text) to authenticated;

-- Owner/admin: add or update a staff member by handle.
create or replace function public.set_lounge_staff(
  p_slug text, p_handle text, p_can_post boolean, p_can_inventory boolean, p_can_edit boolean
) returns void language plpgsql security definer set search_path = public as $$
declare lid uuid; uid uuid;
begin
  select id into lid from public.lounges where slug = p_slug
    and (owner_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')));
  if lid is null then raise exception 'not authorized for this lounge'; end if;
  select id into uid from public.profiles where lower(handle) = lower(p_handle);
  if uid is null then raise exception 'no member with handle %', p_handle; end if;
  insert into public.lounge_staff (lounge_id, user_id, can_post, can_inventory, can_edit, added_by)
  values (lid, uid, p_can_post, p_can_inventory, p_can_edit, auth.uid())
  on conflict (lounge_id, user_id) do update set
    can_post = excluded.can_post, can_inventory = excluded.can_inventory, can_edit = excluded.can_edit;
end $$;
grant execute on function public.set_lounge_staff(text, text, boolean, boolean, boolean) to authenticated;

create or replace function public.remove_lounge_staff(p_slug text, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare lid uuid;
begin
  select id into lid from public.lounges where slug = p_slug
    and (owner_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role in ('admin','super_admin')));
  if lid is null then raise exception 'not authorized'; end if;
  delete from public.lounge_staff where lounge_id = lid and user_id = p_user;
end $$;
grant execute on function public.remove_lounge_staff(text, uuid) to authenticated;

-- Super-admin: approve a bulk claim → assign all listed lounges to the requester
-- (and promote them to a retailer/lounge-owner account).
create or replace function public.approve_claim_request(p_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare req record; n int := 0;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'super_admin') then
    raise exception 'super admins only';
  end if;
  select * into req from public.lounge_claim_requests where id = p_id and status = 'pending';
  if req is null then raise exception 'no pending request'; end if;
  update public.lounges set owner_id = req.requester_id where slug = any(req.lounge_slugs);
  get diagnostics n = row_count;
  update public.profiles set account_type = 'retailer',
         role = case when role in ('admin','super_admin') then role else 'lounge_owner' end
   where id = req.requester_id;
  update public.lounge_claim_requests set status = 'approved', reviewed_by = auth.uid() where id = p_id;
  return n;
end $$;
grant execute on function public.approve_claim_request(uuid) to authenticated;

create or replace function public.reject_claim_request(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'super_admin') then
    raise exception 'super admins only';
  end if;
  update public.lounge_claim_requests set status = 'rejected', reviewed_by = auth.uid() where id = p_id;
end $$;
grant execute on function public.reject_claim_request(uuid) to authenticated;
