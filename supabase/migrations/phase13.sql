-- ════════════════════════════════════════════════════════════════════════════
-- Phase 13 migration — run once.
--  • MyHumidor Aficionado (Freemium) membership flag on profiles.
--  • Lounge "boost" window so credit-boosted lounges are prioritised in Featured.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists aficionado boolean not null default false;

-- Grant the founder account Aficionado.
update public.profiles set aficionado = true
  where id = '33b6d710-4a01-4f8b-8bca-d6b1499ef96e';

-- Lounge boost: a lounge that spends credits to boost sets this into the future.
alter table public.lounges add column if not exists boost_until timestamptz;
create index if not exists lounges_boost_idx on public.lounges(boost_until);
