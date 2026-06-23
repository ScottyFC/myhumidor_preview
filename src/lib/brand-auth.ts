import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { supabaseService } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Untyped service-role client (brand_* tables aren't in the generated Database type). */
export function svc(): SupabaseClient | null {
  return supabaseService() as unknown as SupabaseClient | null;
}

export const BRAND_COOKIE = 'mh_brand';
const SESSION_DAYS = 30;
const RESET_TTL_MIN = 60;

/** Hash opaque tokens (sessions, resets) before storing — DB never holds the raw value. */
function hashToken(t: string): string { return createHash('sha256').update(t).digest('hex'); }

export interface BrandSession {
  accountId: string;
  brandId: string;
  brand: { id: string; slug: string; name: string; tier: 'standard' | 'premium' };
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

/** Verify a reCAPTCHA token server-side. If no secret is configured, don't block. */
export async function verifyRecaptcha(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.SECRET_reCAPTCHA_KEY;
  if (!secret) return true; // not configured → skip (same behavior as the existing route)
  if (!token) return false;
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return !!data.success;
  } catch { return false; }
}

/** Create a session row and return the opaque token (set as an httpOnly cookie). */
export async function createBrandSession(accountId: string): Promise<string | null> {
  const sb = svc();
  if (!sb) return null;
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  const { error } = await sb.from('brand_auth_sessions').insert({ token: hashToken(token), account_id: accountId, expires_at: expires } as never);
  if (error) return null;
  await sb.from('brand_auth_accounts').update({ last_login_at: new Date().toISOString() } as never).eq('id', accountId);
  return token;
}

/** Resolve the current brand session from the request cookie (validates expiry +
 *  that the account is active and bound to a brand). */
export async function getBrandSession(): Promise<BrandSession | null> {
  const sb = svc();
  if (!sb) return null;
  const token = (await cookies()).get(BRAND_COOKIE)?.value;
  if (!token) return null;

  const { data: sess } = await sb.from('brand_auth_sessions').select('account_id, expires_at').eq('token', hashToken(token)).maybeSingle();
  if (!sess) return null;
  if (new Date((sess as { expires_at: string }).expires_at) < new Date()) {
    await sb.from('brand_auth_sessions').delete().eq('token', hashToken(token));
    return null;
  }
  const accountId = (sess as { account_id: string }).account_id;

  const { data: acct } = await sb.from('brand_auth_accounts').select('id, brand_id, status').eq('id', accountId).maybeSingle();
  const a = acct as { id: string; brand_id: string | null; status: string } | null;
  if (!a || a.status !== 'active' || !a.brand_id) return null;

  const { data: brand } = await sb.from('brands').select('id, slug, name, tier').eq('id', a.brand_id).maybeSingle();
  const b = brand as { id: string; slug: string; name: string; tier: 'standard' | 'premium' } | null;
  if (!b) return null;

  return { accountId: a.id, brandId: b.id, brand: { id: b.id, slug: b.slug, name: b.name, tier: b.tier } };
}

export async function destroyBrandSession(): Promise<void> {
  const sb = svc();
  const token = (await cookies()).get(BRAND_COOKIE)?.value;
  if (sb && token) await sb.from('brand_auth_sessions').delete().eq('token', hashToken(token));
}

export function sessionCookieOptions(maxAgeDays = SESSION_DAYS) {
  return {
    name: BRAND_COOKIE,
    httpOnly: true as const,
    secure: true as const,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeDays * 86400,
  };
}


// ── Password reset (token-based, hashed at rest) ───────────────────────────
/** Create a one-time reset token (returns the raw token for the email link). */
export async function createPasswordReset(accountId: string): Promise<string | null> {
  const sb = svc(); if (!sb) return null;
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + RESET_TTL_MIN * 60000).toISOString();
  const { error } = await sb.from('brand_password_resets').insert({ token_hash: hashToken(token), account_id: accountId, expires_at: expires } as never);
  return error ? null : token;
}

/** Validate + consume a reset token, returning the account id. */
export async function consumePasswordReset(token: string): Promise<string | null> {
  const sb = svc(); if (!sb || !token) return null;
  const { data } = await sb.from('brand_password_resets').select('account_id, expires_at, used').eq('token_hash', hashToken(token)).maybeSingle();
  const r = data as { account_id: string; expires_at: string; used: boolean } | null;
  if (!r || r.used || new Date(r.expires_at) < new Date()) return null;
  await sb.from('brand_password_resets').update({ used: true } as never).eq('token_hash', hashToken(token));
  return r.account_id;
}

/** Set an account password and invalidate all its sessions (force re-login). */
export async function setAccountPassword(accountId: string, password: string): Promise<boolean> {
  const sb = svc(); if (!sb) return false;
  const password_hash = await hashPassword(password);
  const { error } = await sb.from('brand_auth_accounts').update({ password_hash } as never).eq('id', accountId);
  if (error) return false;
  await sb.from('brand_auth_sessions').delete().eq('account_id', accountId);
  return true;
}

export async function getAccountByEmail(email: string): Promise<{ id: string; status: string } | null> {
  const sb = svc(); if (!sb) return null;
  const { data } = await sb.from('brand_auth_accounts').select('id, status').ilike('email', email).maybeSingle();
  return (data as { id: string; status: string } | null) ?? null;
}

/** Send an email via Resend if RESEND_API_KEY is configured; returns whether it sent. */
export async function sendBrandEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.BRAND_EMAIL_FROM || 'MyHumidor <no-reply@myhumidor.shop>';
  if (!key) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return r.ok;
  } catch { return false; }
}
