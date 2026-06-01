# Loading the datasets into Supabase

The app ships the full datasets as JSON in `src/data/` so it runs locally with
zero setup. To move them into Supabase, use the seed script.

## Files
- `catalog_cigars.csv` — 23,774 cigars: `id, brand, name, country, price, size, slug, image_url`
- `stores.csv` — 713 stores: `id, slug, name, address, city, state, lat, lng, verified, phone, email, website, hours`

## Step 1 — Create the tables
SQL Editor → paste `supabase/schema.sql` → Run. Creates every table + RLS.

## Step 2 — Seed the data (one command)
1. Project Settings → API → copy the **service_role** key.
2. Add it to `.env.local`:  `SUPABASE_SERVICE_ROLE_KEY=...`
3. From the project root:
   ```bash
   node scripts/seed.mjs
   ```
   Upserts all cigars + lounges in batches. Idempotent — safe to re-run.
   (676 of 713 lounges load; 37 are skipped until their addresses are geocoded.)

## Step 3 — Make yourself super admin
After you've signed up once (so your profile row exists):
```bash
node scripts/seed.mjs --admin
```
Sets `role = 'super_admin'` for your account.

## Manual alternative (no script)
Table Editor → `catalog_cigars` → Import data from CSV → upload
`catalog_cigars.csv` (columns already match). Repeat for `lounges` using
`stores.csv`.
