# Wiring the app to Supabase — migration log

This tracks moving per-user data from the localStorage demo to Supabase, one
domain at a time. Each store is **dual-mode**: it uses Supabase when configured
(your `.env.local` has the URL + anon key), and falls back to localStorage
otherwise — so the demo never breaks.

Whether Supabase is "configured" is decided in `src/lib/supabase.ts`
(`isSupabaseConfigured`). Your `.env.local` already has real keys, so the
Supabase path is live as soon as the tables + buckets below exist.

---

## ✅ Phase 1 — Profiles + Humidor/Wishlist  (this update)

Wired: `src/lib/profile.ts` and `src/lib/collection.ts`.

### Where you need to look (one-time setup)

**1. Run / update the schema.** SQL Editor → run `supabase/schema.sql`.
If you already ran an earlier version, the `humidor_entries` table changed
(it now points at `catalog_cigars`, uses `humidor`/`wishlist` status, and
stores a few denormalized display fields). Drop and recreate just that table:

```sql
drop table if exists public.humidor_entries cascade;
-- then re-run the humidor_entries section of schema.sql
```

**2. Seed the catalog** (so humidor rows can reference real cigars):
`node scripts/seed.mjs` (see `supabase/seed/LOAD_DATA.md`).

**3. Create the avatars bucket** for profile pictures.
Storage → **New bucket** → name `avatars` → **Public** → Save. Then add policies
(Storage → Policies → `avatars`), or run:

```sql
-- public read
create policy "avatars are public" on storage.objects
  for select using (bucket_id = 'avatars');
-- users write only inside their own folder: avatars/<their-uid>/...
create policy "users upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

That's it — no app config beyond the keys you already have.

### How to verify it's working
1. Sign up / sign in. A row should appear in **Table Editor → profiles**
   (created by the `handle_new_user` trigger).
2. Go to `/profile`, edit your city/bio, upload a photo, Save.
   → `profiles` row updates; a file appears in **Storage → avatars/<your-id>/**.
3. Add cigars to your humidor/wishlist (heart/box icons anywhere).
   → rows appear in **Table Editor → humidor_entries** with your `user_id`.
4. Refresh the page / open it in another browser signed in as you — your
   humidor and profile load from the database, not localStorage.

If something doesn't save, open the browser console: the stores log
`[profile] save failed:` / `[collection] save failed:` with the Postgres error
(usually an RLS policy or a missing table).

---

## ✅ Phase 2 — Ratings  (this update)

Wired: `src/lib/ratings.ts` → `ratings` table. Public profiles (`/u/[handle]`)
now fetch any member's profile + humidor + ratings by handle (Supabase mode),
instead of only resolving your own.

### Where you need to look
- **Run `supabase/migrations/phase2_ratings.sql`** in the SQL Editor. It rebuilds
  the `ratings` table to match the app (points at `catalog_cigars`, stores
  tasting notes as an array, adds display fields). One-time; a fresh `schema.sql`
  already has this shape.

### Verify
1. Rate a cigar (Flavor/Burn/Appearance + tasting notes) on any cigar page.
   → a row appears in **Table Editor → ratings** with your `user_id`.
2. Your `/profile` Ratings tab shows it; reload to confirm it loads from the DB.
3. Visit another member's `/u/their-handle` → their humidor, wishlist, and
   ratings load (public read). Yours stays editable at `/profile`.

---

## ✅ Phase 3 — Follows + Feed, and demo-data removal  (this update)

Wired: `src/lib/follows.ts` → `follows` table, and a real home feed
(`src/lib/feed.ts`, rendered by `src/components/Feed.tsx`) built from people you
follow + lounge posts. No schema change needed — `follows` and `lounge_posts`
already exist from `schema.sql`.

**Demo data removed.** Every consumer surface now uses the real catalog: cigar
profiles, `/top` (now "Browse cigars"), `/lounges` (real seeded lounges), the
home carousels/previews, and cigar links in the feed. The fabricated cigars,
lounges, ratings, and feed posts are gone — so everything shown can be rated and
persisted. (Remaining placeholders, for later phases: the cigar "community"
likes/comments block returns empty, and the lounge-owner dashboard analytics
still use sample numbers until the viewership pipeline exists.)

### Verify
1. Follow someone: open a member's `/u/their-handle` (or the Follow button on a
   feed post) → a row appears in **Table Editor → follows**.
2. If that person has rated cigars, their ratings show in your **Humidor → Feed**.
3. With no follows yet, the feed shows a clean "your feed is quiet" empty state
   (not fake posts).

---

## ✅ Phase 4 — Submissions + User search  (this update)

Wired: `src/lib/submissions.ts` → `cigar_submissions` table, and **user search**
(`src/lib/users.ts`) added as a **People** tab in search (with a Follow button on
each result). The Follow button is also on every member profile (`/u/[handle]`).
No schema change needed — `cigar_submissions` already exists.

### Where you need to look
- **(Optional) photos:** if you want submission photos stored, create a public
  Storage bucket named `submissions` (Storage → New bucket → Public) and add the
  same kind of policies as `avatars`. Submissions work without it — the photo is
  just skipped (`photo_url` stays null).
- **Seeing the review queue:** the admin page lists all submissions only for an
  account whose `profiles.role` is `admin`/`super_admin` (RLS). Make sure you ran
  the `update ... set role = 'super_admin'` for your account.

### Verify
1. Signed in, go to `/submit`, add a cigar → a row appears in
   **Table Editor → cigar_submissions** with your `submitted_by`.
2. As an admin, the `/admin` "Cigar submissions" queue lists it; Approve/Reject
   updates `status` (+ `reviewed_by`/`reviewed_at`).
3. Search a member's name/handle in the search bar → **People** tab → Follow them
   → a row appears in `follows`.

> Note: submitting requires being signed in (RLS ties the row to your account).

---

## ✅ Phase 5/6 — Catalog write-back, recents, lounge submissions, certified, admin roles

**Run `supabase/migrations/phase56.sql` once.** Then:
- Approved cigar submissions insert into `catalog_cigars` and are immediately
  searchable (search merges live DB results) with a working profile page.
- "Recently added" sections (cigars, members, lounges) on home / lounges / cigars.
- Submit-your-lounge on `/lounges` → `lounge_submissions`; `/admin` reviews them;
  approval inserts into `lounges`.
- Super admins certify lounges in `/admin` → a Certified badge shows on the profile.
- `isAdmin` reads live `profiles.role` — your Admin link appears automatically.
- Google/Apple sign-in removed (email only).

Optional buckets: `avatars` (profile pics), `submissions` (cigar photos).

## ✅ Geocoding — submitted lounges flow onto the map

- On approval, the lounge address is geocoded via Mapbox and stored as `lat`/`lng`,
  so the lounge appears in **nearby/map** results (the `/api/stores/nearby` route
  now merges geocoded DB lounges with the static directory, deduped by slug).
- **Backfill:** `/admin` → "Certify lounges" → **Geocode missing locations** finds
  any approved lounges with no coordinates and geocodes them (25 at a time).
- Geocoding runs in the browser/route against your `NEXT_PUBLIC_MAPBOX_TOKEN`.
- Note: the main `/lounges` directory grid + map base list are still the static
  snapshot; new lounges surface via "recently added" + nearby/map + their profile
  until the next static rebuild.

## ⏳ Remaining
- **Change requests** (`change_requests`) into the admin queue.
- **Lounge inventory / published menus** (`inventory_items`) to Supabase.
- Geocoding submitted lounges so they show on the map + main directory (they
  currently surface via "recently added" + their profile until then).
