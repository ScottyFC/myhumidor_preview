# MyHumidor — Auth Security Review (phase88)

Scope: the two auth systems — (A) **Supabase Auth** for consumers + lounge/retailers,
and (B) the custom **brand-auth** portal — covering this round's hardening
(rate-limiting + password reset) and the residual risks to address next.

## A. Supabase auth (consumers, lounge/retailers)

How it works: email/password (and OAuth) via Supabase GoTrue; sessions are managed by
`@supabase/ssr` (httpOnly cookies set by Supabase). Passwords are hashed by Supabase
(bcrypt); we never see or store them.

This round:
- **Password reset** uses Supabase's built-in recovery: `requestPasswordReset` →
  `resetPasswordForEmail` (Supabase sends the email), and `/reset-password` →
  `updateUser({password})` using the recovery session from the email link. The request
  endpoint always returns success (no account enumeration). A "Forgot password?" link
  was added to the sign-in form, and a reCAPTCHA gate to the request page.

Mitigated: credential theft (hashing is Supabase's), session handling (httpOnly, SameSite
by Supabase), reset-link expiry/single-use (Supabase-managed), account enumeration on
reset (generic response).

Residual / recommended:
- **Login rate-limiting is Supabase-side**, not in our code (login runs client→GoTrue).
  Enable GoTrue rate limits in the Supabase dashboard (Auth → Rate Limits: sign-in,
  token, email) — this is the authoritative server-side control. Optionally add reCAPTCHA
  to the sign-in submit (it's already on sign-up) for defense-in-depth.
- Consider enabling **leaked-password protection** and a minimum-strength policy in the
  Supabase dashboard, and **MFA/TOTP** for lounge/retailer (higher-value) accounts.
- Email deliverability: configure custom SMTP in Supabase so reset emails don't hit the
  default low-volume limits.

## B. Brand-auth portal (custom)

How it works: credentials in `brand_auth_accounts` (bcrypt cost 12), opaque session
tokens in `brand_auth_sessions`, all access via Node server routes using the service
role. Brand operators are NOT Supabase users. The session cookie is httpOnly + secure +
SameSite=lax; data routes always derive the brand from the session (never trust the
client) and scope reads/writes/deletes to that brand.

This round:
- **Session tokens are now hashed at rest** (SHA-256) — the DB never holds the raw token;
  the cookie carries the only raw copy. A DB read can no longer hijack sessions.
- **Rate-limiting** (DB-backed, `auth_rate_limits`, fail-open): login is limited per IP
  (12 / 15 min) and per email (6 / 15 min → 30 min lock; cleared on success); signup is
  limited per IP (5 / hour); reset request + confirm are limited per IP and per email.
- **Password reset** (`brand_password_resets`): one-time tokens **hashed at rest**, 1-hour
  expiry, single-use; on success all of that account's sessions are invalidated. The
  request endpoint always returns success (no enumeration) and is reCAPTCHA-gated; the
  confirm endpoint is reCAPTCHA-gated and enforces an 8-char minimum. Pages: `/brand/forgot`,
  `/brand/reset`.
- Login uses a constant-time-ish compare even for unknown emails (timing-leak reduction).

Residual / to address before public launch:
- **Email delivery is not wired by default.** Reset emails send only if `RESEND_API_KEY`
  (+ optional `BRAND_EMAIL_FROM`) is set; otherwise the token is created but no email goes
  out. Configure an email provider (Resend, or reuse Supabase SMTP via a small relay) or
  brands can't self-serve reset. Until then, resets are effectively admin-assisted.
- **No CSRF token** on the brand POST routes. SameSite=lax blocks cross-site form POSTs
  and is the current mitigation; add a double-submit CSRF token for defense-in-depth.
- **No MFA** for brand accounts.
- **No email verification at signup** (the application is reviewed by an admin, which
  partly compensates, but the email isn't proven owned until reset/login).
- **Signup isn't transactional** (request row + auth account are two inserts); an
  interrupted signup can leave an orphan request. Low impact; wrap in a transaction/RPC.
- Rate limiter **fails open** if the store is unavailable — intentional (don't lock users
  out on infra blips), but means a DB outage disables throttling. Acceptable trade-off;
  revisit if abuse is observed.
- Lockout is per-key fixed-window; a distributed attacker rotating IPs is only bounded by
  the per-email limit. Consider a global/email-only hard lock after N failures.

## reCAPTCHA
Effective only when both `SECRET_reCAPTCHA_KEY` (server) and the public site key are set;
otherwise verification is skipped server-side (fails open). Confirm both are configured in
production, and verify the widget renders inside the native (Capacitor) webview.

## Cross-cutting recommendations (priority order)
1. Configure Supabase dashboard rate limits + an email provider for brand-auth.
2. Add reCAPTCHA to the consumer sign-in submit; add CSRF tokens to brand POST routes.
3. Add MFA for lounge/retailer + brand accounts.
4. Make brand signup transactional; add email verification.
5. Get an independent review of the brand-auth routes before opening them publicly.

## Test checklist (nothing here has been run — compile-verified only)
- [ ] Supabase: forgot → email → /reset-password → sign in with new password.
- [ ] Brand: forgot → email (with RESEND_API_KEY set) → /brand/reset → login.
- [ ] Brand login lockout after repeated wrong passwords; unlock after window; cleared on success.
- [ ] Brand session survives reload, dies on logout, and is rejected after a password reset.
- [ ] reCAPTCHA enforced on all four entry points (both signups, both logins/resets).
