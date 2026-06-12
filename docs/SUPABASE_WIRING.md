## Phase 31 — Release-prep: auth gating, homepage life, lounge rotation, analytics

**Run `supabase/migrations/phase31.sql`** and make sure `SUPABASE_SERVICE_KEY` is set in Vercel.

- **Auth gating sweep:** browsing stays open, but *doing* now requires an account everywhere, like a real social site. New `useAuthGate()` hook redirects signed-out users to `/register?next=<here>` at the moment of action. Applied to: humidor/wishlist saves (AddToCollection), follows, ratings, likes + comments (EngagementBar), and change requests. Already-gated flows (check-in page, lounge check-in, posts, submissions, claims) unchanged.
- **Homepage:** "Recently aired on CigarTV" removed (feature parked until the data is amended). Hero is now a two-column layout — headline left, a living collage of real brand artwork from the catalog right, with a drifting smoke wisp and ember glow; collage hides on mobile.
- **Lounges page rotation:** the directory reshuffles every 4 hours (seeded so SSR/client agree; `revalidate = 3600`) — every lounge gets time on top. Credit-**boosted** lounges are pinned to the front of the list and exempt from rotation.
- **Analytics backbone:** `page_events` table captures views and time-on-page with coarse location (Vercel geo headers — country/region/city, **no IP stored**), device/OS/browser (UA-parsed server-side), the entity viewed (cigar/lounge/brand slug), referrer, and session id. Writes go only through `/api/track` with the service key (no public insert path); admins-only read. Client beacon (`Analytics` in the layout) logs a view per route change and a leave-with-duration via sendBeacon on hide/navigation. Aggregate views power the new **Admin → Analytics** tab: top cigars/lounges/brands by views & minutes, most-visited pages with avg time, sessions by location, and device/browser/OS breakdown (30-day window).

## Phase 30 — Privada cigar batch (1,062 added)

Imported `Cigars_-_Privada.csv` (already in catalog_cigars shape) into both the static catalog and the DB.
- **1,062 added**, 2 exact brand+name+size duplicates skipped.
- **Slugs made unique by appending vitola** where a line repeats across sizes (e.g. La Validación Connecticut → Gran Robusto / Gran Toro / Toro each get their own page). Catalog is now 100% unique slugs (25,136 total).
- **Mojibake repaired** (the export had Mac-Roman double-encoding: "Validaci√≥n" → "Validación", "√önico" → "Único", plus hand-fixes for Toraño / Patrón / Pequeños / Brûlée).
- **359 auto flavor-tagged** via the brand/line map (Liga Privada, Aganorsa, AJ Fernandez, etc.).
- **`supabase/migrations/phase30.sql`** seeds the same rows into `catalog_cigars` (preserves the CSV UUIDs, idempotent — `where not exists` by slug). Run it, and redeploy so the static catalog ships too.

## Phase 29b — Bug fixes + endless carousels + watchable episodes

- **Sign out fixed:** the handler navigated before the async `signOut()` resolved, cancelling it (you stayed logged in). Now it awaits sign-out (and a local-scope clear) before redirecting home.
- **Verify entry points** now hide once a lounge is verified **or** certified (toolbar + dropdown), via `loungeDone = verified || certified`.
- **Carousels loop endlessly:** `AutoScrollRow` renders a second identical copy when content overflows and wraps scroll by exactly one copy's width — seamless, no snap-back. Short rows render one copy and don't animate.
- **Recently aired shows:** the homepage "Recently aired on CigarTV" section now renders MRSS episodes as watch cards — thumbnail + play button + runtime linking to the episode's `videoUrl`, with the featured cigar linked when tagged.

### Removing the "Freecast Cigar Lounge" account (run in Supabase SQL editor)
It's a database record, not static data, so it can't be removed from code. Safe cleanup:
```sql
-- find it first
select id, slug, name from public.lounges where name ilike '%freecast%';
-- remove the lounge + its links (adjust slug/name as needed)
delete from public.lounge_members where lounge_id in (select id from public.lounges where name ilike '%freecast%');
delete from public.inventory_items where lounge_id in (select id from public.lounges where name ilike '%freecast%');
delete from public.lounge_submissions where name ilike '%freecast%';
delete from public.lounges where name ilike '%freecast%';
-- if it's also a retailer auth account, delete that user from Authentication → Users
```

## Phase 29 — Modernization II, badge overhaul, Cigar Concierge, certification tiers

**Run `supabase/migrations/phase29.sql`** — adds `lounges.cert_tier` ('none'|'starter'|'pro'|'premier'), moves legacy certified lounges to Starter, and adds the member-only `set_cert_tier` RPC that keeps `certified` in sync.

- **Certification tiers (Untappd-for-Business style):** dashboard now has a Certification section. Verification stays the free prerequisite (panel points to /verify until then); once verified, three plans — Starter $49 / Pro $99 / Premier $199 (placeholder pricing) — with feature lists, current-plan highlight, and instant Upgrade / Downgrade / Cancel. Honest note in-UI: billing isn't wired yet; tier changes apply to the listing immediately without charging. Verify stays hidden from toolbar/dropdown once verified (existing behavior).
- **Cigar Concierge (AI agent)** on the Cigars page (/top): chat UI + `/api/cigar-agent`. Parses budget ("under $15", "$8 to $12"), countries, flavor words (full flavor_tags vocab), vitolas, strength ("full-bodied"/"mild morning smoke"), and brand references ("like Padrón"); retrieves + scores the live 24k catalog and answers with pick cards + reasons. If `ANTHROPIC_API_KEY` is set in env the reply is written by Claude (claude-haiku); otherwise a solid template reply is used — retrieval is identical either way.
- **Modernization:** richer layered site background (gold ember top-left, rust drift, leather pool — still recedes behind content); profile avatar gets an ember gradient ring + Aficionado crown chip, action buttons become a primary Edit pill + grouped secondary pills; lounge cards (home + directory) get gradient surfaces, hover lift, an ember accent line, and a Verified chip.
- **Badge overhaul:** generated medallions now carry themed icons matched to what each badge is about (Cuban→globe, coffee→cup, humidor→archive, check-ins→pin, price→gem, perfect score→trophy, …18 rules + deterministic fallback pool) with a tier dot instead of the plain GOLD/SILVER text. Bespoke badge artwork (imageUrl) still always wins.

## Phase 28 — flavor_tags + UI modernization

**flavor_tags:** `catalog_cigars.flavor_tags text[]` (GIN-indexed) added by `supabase/migrations/phase28.sql`, which also seeds **52 mainstream brands** (Padrón, Fuente, Drew Estate, Oliva, Davidoff, My Father, …) with their documented house profiles plus 5 line-level overrides (Liga Privada, OpusX, Undercrown, Herrera Estelí) that always win. Brand seeds only fill rows with empty tags, so hand-curated data is never overwritten. The static catalog got the same treatment — **12,415 of 24,074 cigars now tagged**. The flavor engine now does true per-SKU matching (W=2.0 capped): a candidate's tags are scored against the member's logged tasting notes, and the `why` cites them ("its cocoa & earth profile matches the notes you rate highest").

**UI modernization (per screenshots):** homepage hero gains an ambient ember glow and a live stats strip (cigars tracked / lounges / 24-7 live, real counts); featured-cigar cards get a price chip on the tile and hover lift; profile badges get a gradient collection-progress bar and a tighter responsive grid (up to 6 columns on wide screens).

## Phase 27 — Flavor Profiling engine + geospatial refactor

**Flavor Profiling** (`src/lib/flavor-engine.ts`, `/api/recommendations`): rating-weighted taste vector (5★≈+2 … 1★≈−2, so dislikes steer away) over brand ×3 / country ×2 / vitola ×1.25 / price-fit ×1, scored across the full 24k catalog, diversified (max 2 per brand, no back-to-back same brand), each pick returned with a user-facing `why` built from the member's own anchors and tasting notes. The profile "Recommended for you" row now sends full rating history (incl. tasting notes) and renders the explanations. Legacy `likedSlugs` payloads still work. Honest limit: the catalog has no per-cigar flavor data, so notes influence explanations via the countries/brands they were logged against rather than per-SKU flavor matching.

**Geospatial** — run `supabase/migrations/phase27.sql` (idempotent): enables PostGIS; adds a generated `lounges.location geography(point)` (always in sync with lat/lng) + GIST index; adds an `updated_at` touch trigger on `inventory_items` and adds it to the realtime publication; creates two indexed RPCs — `lounges_near(lat,lng,radius,limit)` and `cigar_stock_near(slug,lat,lng,radius,limit)`. `/api/stores/nearby` now uses `lounges_near` (with the old bounded-scan as fallback pre-migration, and the static directory always merged), and the new `/api/cigars/[slug]/stock-near` returns live in-stock lounges sorted by true distance. Cigar pages show an "In stock near you" strip when the visitor shares location and someone nearby stocks it.

## Retailer simplification + check-ins + shop logo + cigar-image fallback

- **Retailers have no profile.** `/profile` redirects retailers to `/dashboard`, and the "My Lounge" toolbar button is removed. They use the dashboard + their public shop page (a "View shop page" link sits on the dashboard).
- **Shop logo** uploads from the dashboard (the existing logo editor, now shown there with `force`); customers see it on the shop page (`lounges.image_url`).
- **Geolocation check-in:** the lounge page shows a "Check in here" button that only enables when the visitor's GPS is within ~250m of the lounge's coordinates (lounges without coordinates can't verify presence). The lounge page now shows check-ins from **the last 7 days**.
- **Cigar image fallback:** when a cigar has no artwork, the detail page tries the brand logo via `/api/brand-logo` and falls back to a branded monogram. The route uses the Google Custom Search JSON API when `GOOGLE_CSE_KEY` + `GOOGLE_CSE_CX` env vars are set; without them it returns nothing and the monogram shows. (Programmatic Google image search needs those API credentials — there's no key-free way to query Google images within terms of service.)

### TV app
- **Live feed hardening:** the player now allows cross-protocol redirects (the usual cause of HLS "won't load" on CDNs), sets the HLS mime type explicitly, uses a real User-Agent, and auto-retries transient live errors.
- **Stay-signed-in:** on launch the app refreshes the stored session; a genuinely-expired/invalid session now drops to login instead of appearing signed-in but failing every call.
- **Splash** runs ~3.4s over the site's char→ember wash, logos centered both axes and enlarged; **TV banner + launcher icon** set from the supplied artwork.
## Phase 26 — Fix: lounge_submissions_submitted_by_fkey violation on verify

**Cause:** the account had no `public.profiles` row, so `submitted_by` (FK → profiles) failed. The signup trigger never created one for it (created before `account_type` allowed `retailer`, or the trigger wasn't installed), and there was no policy letting a user create their own profile.

**Run `supabase/migrations/phase26.sql`** — this is required to unstick existing accounts. It:
1. Adds a `users insert own profile` policy (`auth.uid() = id`).
2. **Backfills a profile for every `auth.users` row that's missing one** — this immediately fixes the stuck retailer account.
3. Re-asserts the `handle_new_user` trigger + `on_auth_user_created` trigger so future signups always get a profile.

**Code:** all three submission paths (`requestVerification`, `submitLounge`, `submitClaim`) now call a client `ensureProfile()` first, which self-creates the profile row if it's missing (works once the phase26 policy is in place) — a safety net so this can't recur for new accounts.

## Phase 25 — Why the import didn't show + verify geocoding + retailer UX

**Why the cigars/lounges never appeared:** the import only went into the static catalog JSON, which is bundled at **build time** — it shows only after a Vercel **redeploy**. This phase also seeds them into the database so they show on DB-backed surfaces too. To make them appear: **redeploy the app** AND run `supabase/migrations/phase25.sql`.

`phase25.sql` (idempotent — re-running skips rows already present by slug):
- Makes `lounges.lat/lng` nullable so a lounge can be added before it's geocoded (the map skips coordinate-less rows).
- Adds `lat/lng` (+ `kind`, `business_license`, `contact_name`, `claims_ownership`) to `lounge_submissions`, and re-asserts the admin SELECT/ALL policy so verifications reliably show in the admin queue.
- Seeds the 300 boutique cigars into `catalog_cigars` and the USA lounges into `lounges`.

**Verify flow:** the verify form now has a **Mapbox address autocomplete** — selecting a suggestion fills street/city/state and captures exact coordinates, which ride through `requestVerification` → on approval the lounge is created with those coordinates (falling back to a server geocode if none were captured). This fixes both "add an auto address fill" and the approval failing when coordinates were missing.

**Retailer UX:** retailers have no humidor (`/humidor` redirects them to the dashboard); the top **My Lounge** button goes to their profile (`/profile`); "My Profile" and "My Lounge Page" were removed from the account dropdown.

## Catalog import — Top 300 boutique cigars + USA lounges

Imported into the static catalog (`src/data/cigars.json`, `src/data/stores.json`) — no SQL needed; ships on the next deploy.
- **Cigars:** 300 added (0 skipped — all boutique brands new to the catalog), deduped by normalized brand+name and slug.
- **Lounges:** 15 added, 3 skipped as duplicates/similar names. These were added without coordinates (the source CSV had none and geocoding isn't available offline), so they appear in search, listings, and have profile pages, but won't drop a map pin until geocoded. They can be geocoded later or fixed via the verify flow.
- **Brand grouping:** new `/brands/[slug]` page lists every catalog cigar for a brand (plus any DB `catalog_cigars` of that brand). The profile now shows a selectable **Brands** row built from the member's humidor/wishlist/ratings; tapping a brand opens its page.

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
## Phase 13 — Aficionado (Freemium), carousels, daily featured

Run `supabase/migrations/phase13.sql` once (adds `profiles.aficionado` + grants
`33b6d710...`, adds `lounges.boost_until`).

- Auto-scroll carousels: featured cigars/lounges + recently-added strips auto-advance (pause on hover/touch/hidden tab; respect reduced-motion).
- Featured rotates daily; credit-boosted lounges lead the carousel. Lounges boost from the dashboard Boost control (7-day window).
- Removed the wavy Vanta backdrop on badges (medals keep the tilt).
- MyHumidor Aficionado ($3.99-$5.99/mo, $40/yr): homepage section + working pieces (Verified Aficionado chip, real Aging Tracker (member-gated), ad-free feed). `33b6d710...` is a member. Flavor Profiling / giveaways / exclusive badges are marketed perks, not yet functional; upgrade button is a placeholder (no checkout) — membership is a DB flag for now.

## Phase 14 — Profile redesign, price/country badges, recommender, exclusive tier

Run `supabase/migrations/phase14.sql` once (adds `badges.aficionado_only` + seeds exclusive badges).

- /profile now loads humidor + ratings from the DB by user id (same source as /u/handle), so the two pages match.
- Price/country badges (e.g. Unicorn Chaser "costs over $100") now evaluate via a server enrichment route (/api/cigars/enrich) that supplies price + country per slug; parser handles price-over/under, Nicaraguan/Dominican/Cuban tobacco, vitolas, brand mastery, notes, counts.
- Profiles are one page: badges at the top, then Humidor / Wishlist / Ratings as auto-scroll carousels (no tabs). Bigger avatar; more space above the Verified Aficionado chip.
- Flavor Profiling recommender (Aficionado-gated): /api/recommendations suggests catalog cigars sharing brand/country with the user's 4★+ ratings. Nearby-in-stock is a link to /lounges for now (not precise distance/stock yet).
- Exclusive badge tier: `aficionado_only` badges only auto-award to Aficionado members.

## Phase 15 — Check-ins, notifications, social links, follow suggestions

Run `supabase/migrations/phase15.sql` once. Check-in photos reuse the `avatars`
bucket (so phase12 storage policies + Public bucket must be in place).

- Check-ins: /check-in (in the account menu) — pick a cigar, optional lounge, star rating, review, photo. Shows on the lounge profile ("Recent check-ins") and on the user's profile; a check-in notifies the lounge's members.
- Notifications: bell in the toolbar with unread count + dropdown; mark-all-read on open; realtime. Follow events are wired now. Manage at /account#notifications (also in the profile dropdown). Like/comment + lounge-follow notifications are scaffolded but need an underlying like/comment + lounge-follow system (not built yet).
- Social links: profiles.socials + lounges.socials (jsonb). Edit in profile edit mode and the lounge dashboard; icons display on both profile types.
- Suggested follows: self-only block on /profile — newest members, locals (same state) first, excludes self + people already followed.

## Phase 16 — Follow lounges, richer feed, public activity

Run `supabase/migrations/phase16.sql` once (adds `lounge_follows`).

- Users can follow lounges (Follow button + follower count on the lounge profile). When a lounge posts, its followers get a notification (respecting the "Posts from lounges you follow" setting).
- Home feed now merges followed users ratings AND check-ins (photo + review), plus recent/promoted lounge posts, sorted newest-first with promoted leading.
- Public profiles show followers/following (FollowStats) and earned badges (hidden when none earned).
- Profiles now have a unified Activity feed: ratings with their written reviews + tasting-note tags, interleaved with check-ins, newest first.

## Phase 18 — Lounge business accounts, credits, verify/certify

Run `supabase/migrations/phase18.sql` once (adds `lounges.credits` default 1000, and `business_license` / `contact_name` / `kind` to `lounge_submissions`).

- **Lounge toolbar** is now distinct from the consumer one: the "Humidor" tab becomes **Inventory** (→ dashboard), and the top bar gains **My Lounge** (jumps to the lounge's public page), **Verify**, and **Dashboard** buttons. The account menu drops "Check in" and adds "My Lounge Page", "Verify & Certify", and "Add a Cigar".
- **Verify & certify** (`/verify`): a lounge owner submits verifiable business details (legal name, address, phone, website, business license / tax ID, contact name). Saved to `lounge_submissions` with `kind='verify'` and `claims_ownership=true`, so it lands in the same admin queue; approving it verifies and links ownership of the lounge. The admin pending list now shows the license, contact, phone, and website inline.
- **Business profiles**: lounge accounts no longer render humidor, ratings, badges, aging, or flavor sections on `/profile` or `/u/[handle]`. They get a business panel plus follower/following counts and suggested follows, and can follow both members and other lounges to build a feed.
- **Credits**: every lounge starts at 1,000 credits (`lounges.credits`). The dashboard shows the live balance; it will grow with viewing time once screens connect to the CigarTV app.
- **Search**: `/api/stores` now merges the live `lounges` table with the static 713-store directory, so newly approved lounges (e.g. Creekside Cigar Co) are findable. DB matches lead, deduped by slug.

### Lounge submission insert fix (auth race)
`submitLounge`, `submitCigar`, and `createCheckIn` no longer trust a possibly-cold cached user id — they resolve the signed-in user via `auth.getUser()` when needed and surface the real error to the UI instead of silently failing.

## Phase 17 — Likes, comments, and the new submission workflow

Run `supabase/migrations/phase17.sql` once (adds `likes`, `comments`, `cigar_submissions.slug`, and a catalog-insert policy for verified lounges).

- Likes + comments on every feed item and on profile Activity rows (ratings + check-ins + lounge posts). Likes/comments notify the owner (honoring their notification settings). Counts + inline comment threads.
- Submission workflow: submitting a cigar that is not in the catalog records it as pending and tells the user it will show on their own profile/feed but stays private until approved. Posts (ratings/check-ins) reference the cigar inline, so they appear immediately on the user's page.
- If another member already has the same cigar pending, the submitter is told but can still post.
- A verified lounge submitting a not-yet-listed cigar with full details (brand, name, country, size) is auto-approved and pushed live immediately, and the action is logged on the admin Activity log as "auto-approved (verified lounge)".

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

## ✅ Phase 7 — Change requests, inventory, moderation upgrades

**Run `supabase/migrations/phase7.sql` once.** Then:
- **Change requests** → `change_requests`, reviewed in `/admin` → Change requests.
- **Lounge inventory + published menus** → `inventory_items` (now keyed to
  `catalog_cigars` + a `published` flag). Dashboard publishes; the lounge profile
  shows the live menu.
- **Super admins can delete cigars** (button on the cigar profile) and **amend a
  rejected submission to approved** (cigar + lounge queues).
- **Reviews are universal**: submission/change-request queues sync across admins
  via Realtime, catalog/lounge pushes are idempotent (no duplicates), and each
  decided item shows **who** actioned it.
- **Lounge profile picture**: replace control for super admins (lounge profile)
  and for the lounge itself (dashboard). Uploads to the `avatars` bucket.
- "Top Cigars" → **Cigars**, with **Top This Week** + **Highest Rated** sections
  (from the `cigar_rating_week` / `cigar_rating_stats` views).
- Footer logo links home.

> Image uploads use **Supabase Storage** (`avatars` bucket), not the CloudFront
> path — CloudFront is read-only delivery for the pre-existing brand logos.

## ✅ Phase 8 — Lounge ownership, audit log, review window

**Run `supabase/migrations/phase8.sql` once.** Then:
- **Lounge profile levels**: `lounge_members` (owner / manager / staff). Claiming a
  lounge (its profile → "Claim this lounge") files a `lounge_claims` row; a super
  admin approves it in `/admin` → **Lounge claims**, which sets `lounges.owner_id`
  and adds an `owner` membership. The dashboard lists "Lounges you manage."
- **Tightened RLS**: inventory, posts, and lounge edits now require membership of
  that lounge (or admin). Claim + approval is the path to managing a lounge.
- **Review window**: cigar submissions and lounge claims expand to show every
  detail (photo, notes, MSRP, submitter) before deciding.
- **Activity log**: `/admin` → **Activity log** shows full change history; lounge
  owners see their lounge's history in the dashboard ("Recent activity").
  Recorded via `audit_events` on approvals, certifications, deletes, claims,
  change requests, admin role changes, menu publishes, and logo changes.

> The `avatars` bucket is created — profile and lounge photo uploads work.

## ✅ Phase 9 — Lounge posts, near-me, submit-fix, unified verify

**Run `supabase/migrations/phase9.sql` once** (adds `claims_ownership` to
lounge submissions).

- **Submission bug fixed**: the submit-your-lounge form now requires sign-in
  (RLS ties the row to your account; an unsigned submit was silently inserting
  nothing). It also surfaces errors instead of failing quietly.
- **Submit + verify unified**: the form has an "I own/manage this lounge" option.
  Approving such a submission verifies the lounge and assigns the submitter as
  owner (membership) in one step.
- **Lounge posts**: owners create deals / new arrivals / events from the
  dashboard; they show on the lounge profile and flow into the home feed.
- **Search autofill** (the nav bar) now merges live DB results, so approved
  cigars are findable immediately.
- **Near me**: the lounges page has a "Lounges near you" finder; each lounge
  profile links to its location on the map (`/map?lat&lng`).
- **Logos**: a lounge's photo shows everywhere it's set (even before it's
  claimed); confirmed owners/members (and super admins) can replace it.

## ✅ Phase 10 — Bug fixes, sole super admin, tiers, registration

**Run `supabase/migrations/phase10.sql` once** (it's idempotent and also
backfills anything missed from phase7/9).

- **Duplicate/“reappearing” submission bug**: root cause was the moderation
  status update failing (missing `catalog_id` column if phase7 wasn't run, or the
  acting account not being a real super admin → RLS blocks the update with no
  error, so the row stayed pending and re-clicking re-inserted). Now the code
  reads the authoritative DB state before acting (no double catalog insert),
  warns in console if the update changes 0 rows, and the migration backfills the
  columns. **The real fix is being a DB super admin** — see below.
- **Sign-ups not coming through**: the signup trigger now picks a collision-safe
  handle (duplicate email-prefixes no longer abort the profile insert), and the
  migration backfills profiles for any existing auth users without one.
- **Sole super admin**: `33b6d710-4a01-4f8b-8bca-d6b1499ef96e` is now the only
  super admin (migration + bootstrap allowlist). The demo “Become super admin”
  button is removed.
- **Account required** to submit a cigar and to submit/verify a lounge (both
  forms now require sign-in and surface errors).
- **Registration**: sign-in is the default (create-account is the secondary
  link), account types renamed to **Cigar Aficionado** / **Retailer** (“Manage
  inventory & posts”), and the “Sean” placeholder is gone.
- **Lounge tiers** on `/lounges/join` (Basic free / Pro / Premium / Elite-soon).
- **Profile**: avatars upload only inside Edit Profile and save with the form;
  added a **Share** button; admin-only details stay gated to super admins.
- **Facebook connect**: placeholder button (marked “Soon”) — a real Graph API
  integration is a separate build.
- Review window already shows the uploaded submission photo.

## ✅ Phase 11 — Decision errors surfaced, profile removal, footer, account menu

**Run `supabase/migrations/phase11.sql` once** (super-admin profile deletion).

- **Approvals not moving / rejected→approved not updating**: the decision call
  now returns success/failure and the admin queue shows a **red error banner**
  instead of silently reverting. If you see “No rows updated — this account is
  not a super admin,” the fix is to run `phase10.sql` and sign in as
  `33b6d710-4a01-4f8b-8bca-d6b1499ef96e`. That RLS block (acting account isn’t a
  DB super admin) is the cause of the row snapping back to pending.
- **Remove profiles**: super admins get a “Remove profile” control on any
  member’s public page (`/u/[handle]`). Cascades to that member’s ratings /
  humidor / follows; the auth.users record still needs the dashboard/service role.
- **Search placeholder**: “Search Thousands of Cigars, Lounges, Shops and Fellow
  Smokers” in both the nav and full search.
- **Footer**: Surgeon General warning, MyHumidor™ trademark disclaimer, Contact
  us (submissions@cigartv.com), Help, and Terms links.
- **Account menu** (top-right under your name): My Profile, Submit a Cigar,
  Account Settings, Sign out.
- **Account Settings** (`/account`): change email, change password, deactivate
  (sign-out + flag; permanent deletion via the service role / email request).

## ✅ Phase 12 — Avatar fix + badges (matched to your real table)

**Run `supabase/migrations/phase12.sql` once**, and mark the `avatars` bucket
**Public** in the dashboard.

- **Profile photos not saving — fixed.** The `avatars` bucket had no Storage
  policies, so uploads were silently denied. phase12 adds public-read +
  authenticated-write (also fixes lounge logos, same bucket).
- **Badges matched to your table** (`id, slug, name, criteria, tier`). The
  migration only *adds* `image_url` + `lounge_id`, enables RLS with public read,
  and attaches the seven uploaded PNGs to their matching slugs (incl.
  `estelí-explorer`). The other ~254 badges render as tier-coloured medallions
  (bronze/silver/gold/rare) until you add art — set `image_url` to `/badges/x.png`.
- **Earning is live for the computable families** by parsing each badge's
  criteria text: humidor counts, total reviews, “rate your first cigar”, brand
  mastery (“Rate N different cigars from X”), vitola counts (“Rate N Robusto
  vitolas”), tasting-note tags (“Identify the 'Cedar' note in N reviews”), and
  the perfect-/low-score badges. Awarded automatically on profile view.
  *Not yet auto-awarded* (no data tracked yet): country/wrapper origin, price
  tiers, dates/streaks, social (likes/comments), band photos, account age,
  Cuban/regional/limited — these stay locked until those fields exist.
- Badges show on `/profile` and `/u/[handle]` (earned first, with a “Show all”).
- **Premium custom badges**: Premium/Elite lounges get a badge designer in the
  dashboard; visitors collect them from the lounge page.
- Removed “By the numbers” on `/lounges/join`.

> 3D: medals tilt to the pointer and sit on a Vanta.js WebGL backdrop loaded from
> CDN at runtime (degrades to flat if blocked) — give it a look in the browser.
- **Change requests** (`change_requests`) into the admin queue.
- **Lounge inventory / published menus** (`inventory_items`) to Supabase.
- Geocoding submitted lounges so they show on the map + main directory (they
  currently surface via "recently added" + their profile until then).
