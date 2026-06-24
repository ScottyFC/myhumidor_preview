# Email setup — Resend + DNS (brand verification & password-reset emails)

Sending address: **verify@myhumidor.com**
Env vars (set in Vercel → Project → Settings → Environment Variables, then redeploy):

```
RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxxxxx          # from Resend → API Keys
BRAND_EMAIL_FROM = MyHumidor <verify@myhumidor.com>   # optional; this is also the code default
```

> Heads-up: the site is `myhumidor.shop`, but the sending address is on `myhumidor.com`.
> That's fine — email deliverability depends on the **sending domain**, so the DNS records
> below go on **myhumidor.com** (wherever its DNS is hosted), not on myhumidor.shop.

---

## 1. Create the Resend account + API key
1. Sign up at resend.com.
2. API Keys → Create API Key (Full access or Sending). Copy it into `RESEND_API_KEY`.

## 2. Add and verify the domain
1. Resend → Domains → Add Domain → enter **myhumidor.com**.
   - Pick the region closest to your users (e.g. `us-east-1`). The exact DNS values Resend
     shows are **region-specific** — always copy them from the Resend dashboard, don't
     hand-type from memory.
2. Resend will show a set of records to add at your DNS host. They fall into these types
   (names/values shown are the *shape*; use Resend's exact values):

   | Purpose            | Type  | Host / Name (example)        | Value (from Resend)                          |
   |--------------------|-------|------------------------------|----------------------------------------------|
   | DKIM (signing)     | TXT   | `resend._domainkey`          | `p=MIGfMA0...` (long key Resend gives you)    |
   | SPF (sender auth)  | TXT   | `send` (i.e. send.myhumidor.com) | `v=spf1 include:amazonses.com ~all`       |
   | Return-path / bounces | MX | `send`                       | `feedback-smtp.<region>.amazonses.com` (prio 10) |
   | DMARC (recommended)| TXT   | `_dmarc`                     | `v=DMARC1; p=none;`                           |

   Notes:
   - Resend currently routes through Amazon SES, which is why SPF includes `amazonses.com`
     and the return-path MX points at an SES feedback host. If Resend shows different
     values, use theirs.
   - If you already have an SPF TXT on the relevant host, **merge** includes into the one
     record (you can't have two SPF records on the same host).
   - Use the exact Host/Name format your DNS provider expects (some want
     `send.myhumidor.com`, some want just `send`).

3. Save the records at your DNS host, then click **Verify** in Resend. Propagation is
   usually minutes but can take up to a few hours.

## 3. Set the env vars + redeploy
- Add `RESEND_API_KEY` (and optionally `BRAND_EMAIL_FROM`) in Vercel for Production
  (and Preview if you test there). They are server-only — do **not** prefix `NEXT_PUBLIC`.
- Redeploy so the new env is picked up.

## 4. Test
- Trigger a brand verification (sign up a test brand) or a password reset.
- Check the recipient inbox (and spam).
- If nothing arrives, check the Vercel **Functions logs** for a line beginning
  `[brand-email]` — it prints the exact Resend rejection (status + body), e.g.
  "domain is not verified" or "from address not allowed". That tells you precisely what to
  fix.

---

## What each email path uses

| Email                                   | Sent by   | Sender                         |
|-----------------------------------------|-----------|--------------------------------|
| Brand email verification                | Resend    | `BRAND_EMAIL_FROM` (verify@…)  |
| Brand password reset                    | Resend    | `BRAND_EMAIL_FROM` (verify@…)  |
| Consumer / lounge password reset        | **Supabase** | Supabase Auth email settings |

The consumer + lounge reset emails (`resetPasswordForEmail`) are sent by **Supabase**, not
Resend, so they use Supabase's own email config. By default Supabase uses its built-in
sender with low rate limits; for reliable delivery, set up **custom SMTP** in
Supabase → Authentication → Emails → SMTP. You can point that at Resend's SMTP
(host `smtp.resend.com`, port 465, user `resend`, password = your `RESEND_API_KEY`) using
the same verified `myhumidor.com` domain, so both systems send from the same place.

## Common failure reasons (from the `[brand-email]` log)
- **"The domain is not verified"** — DNS records not added/propagated, or you verified a
  different domain. Re-check the records on myhumidor.com.
- **"Invalid `from` field"** — `BRAND_EMAIL_FROM` must be `Name <email@domain>` and the
  email's domain must be the verified one (verify@myhumidor.com).
- **Nothing logged, no email** — `RESEND_API_KEY` isn't set in that environment, so signup
  auto-verifies and sends nothing. Set the key and redeploy.
- **Only your own address receives mail** — you're still on the `onboarding@resend.dev`
  test sender. Switch to `verify@myhumidor.com` after the domain verifies.
