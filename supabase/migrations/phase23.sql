-- ════════════════════════════════════════════════════════════════════════════
-- Phase 23 — Lounge posts: photo + 'update' kind + boost; spend-credits RPC.
-- ════════════════════════════════════════════════════════════════════════════

-- Post types: add a generic "Store update" + a photo + a boost window.
alter table public.lounge_posts drop constraint if exists lounge_posts_kind_check;
alter table public.lounge_posts add constraint lounge_posts_kind_check
  check (kind in ('deal','new_arrival','event','update'));
alter table public.lounge_posts add column if not exists photo_url text;
alter table public.lounge_posts add column if not exists boost_until timestamptz;

-- Spend credits (boosting a post, etc). SECURITY DEFINER so the balance can only
-- change through this checked path. Caller must be a member of the lounge and
-- have enough credits. Logs a negative entry to credit_ledger.
create or replace function public.spend_credits(p_lounge uuid, p_amount int, p_reason text default 'boost')
returns int  -- new balance
language plpgsql security definer set search_path = public as $$
declare v_balance int;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if not exists (select 1 from lounge_members m where m.lounge_id = p_lounge and m.user_id = auth.uid()) then
    raise exception 'not a member of this lounge';
  end if;
  select credits into v_balance from lounges where id = p_lounge for update;
  if v_balance is null then raise exception 'lounge not found'; end if;
  if v_balance < p_amount then raise exception 'insufficient credits'; end if;
  update lounges set credits = credits - p_amount where id = p_lounge returning credits into v_balance;
  insert into credit_ledger (lounge_id, delta, reason) values (p_lounge, -p_amount, p_reason);
  return v_balance;
end $$;
grant execute on function public.spend_credits(uuid, int, text) to authenticated;
