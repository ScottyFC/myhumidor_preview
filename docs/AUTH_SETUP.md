# Auth & email confirmation setup

The code is wired for real auth and email verification. These steps happen in the
Supabase dashboard (project: `daxizltupchiijrdrtep`).

## 1. Turn on email confirmation

Authentication → Providers → Email → enable **Confirm email**.

With this on, `supabase.auth.signUp()` (already called in `src/lib/auth.ts`) sends
a confirmation email automatically. Until the user clicks the link, no session is
created — the app detects this (`needsConfirmation`) and shows the "Verify your
email" screen with a resend button.

> While developing you can leave Confirm email OFF so signups log in instantly.
> Turn it ON for production.

## 2. Allow the redirect URLs

Authentication → URL Configuration:
- **Site URL:** your production origin (e.g. `https://myhumidor.app`)
- **Redirect URLs:** add both
  - `http://localhost:3000/auth/callback`
  - `https://yourdomain/auth/callback`

The confirmation email's link verifies the user, then returns them to
`/auth/callback`, which exchanges the code for a session and routes consumers to
`/humidor`, lounges to `/dashboard`. Expired/used links bounce back to
`/register?error=...`, which shows a friendly notice.

## 3. (Optional) Customize the email

Authentication → Email Templates → **Confirm signup**. Brand the subject and body;
keep the `{{ .ConfirmationURL }}` variable. Supabase's built-in mailer is rate-
limited and fine for testing — add a custom SMTP provider (Resend, Postmark,
SendGrid) under Project Settings → Auth → SMTP before launch so emails land
reliably and from your domain.

## 4. Run the schema

SQL Editor → run `supabase/schema.sql`. This creates `profiles` (with the typed
`public_id`, `city`, `state`, `bio`, `avatar_url`) and the `handle_new_user`
trigger that stamps `USER-`/`LNGE-` IDs on signup.

## 5. Social logins (optional)

Authentication → Providers:
- **Google:** create an OAuth client in Google Cloud Console, paste client ID/secret.
- **Apple:** requires a paid Apple Developer account + Services ID + key.

Both call `signInWithOAuth` and return through the same `/auth/callback`.

## Resend behavior

The "Verify your email" screen calls `supabase.auth.resend({ type: 'signup' })`
with a 30-second cooldown. Supabase enforces its own rate limits on top of that.
