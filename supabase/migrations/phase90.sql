-- Phase 90 — Brand MFA (TOTP) + transactional signup.

alter table public.brand_auth_accounts add column if not exists totp_secret text;
alter table public.brand_auth_accounts add column if not exists mfa_enabled boolean not null default false;

-- Atomic brand signup: insert the application + the (pre-hashed) auth account in one
-- transaction, returning the new account id. Avoids orphan rows on partial failure.
-- SECURITY DEFINER + service-role-only callers; password is hashed in the route first.
create or replace function public.create_brand_signup(
  p_contact_name text, p_company text, p_email text, p_password_hash text, p_tier text,
  p_business_address text default null, p_website text default null, p_phone text default null,
  p_tax_id text default null, p_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_account_id uuid; v_tier text := case when p_tier = 'premium' then 'premium' else 'standard' end;
begin
  if exists (select 1 from public.brand_auth_accounts where lower(email) = lower(p_email)) then
    raise exception 'account exists';
  end if;
  insert into public.brand_signup_requests (user_id, contact_name, company, business_address, email, website, phone, tax_id, tier, notes)
  values (null, p_contact_name, p_company, p_business_address, p_email, p_website, p_phone, p_tax_id, v_tier, p_notes);
  insert into public.brand_auth_accounts (email, password_hash, status)
  values (p_email, p_password_hash, 'pending')
  returning id into v_account_id;
  return v_account_id;
end $$;
revoke all on function public.create_brand_signup(text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
