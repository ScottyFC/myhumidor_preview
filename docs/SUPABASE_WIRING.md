## Sign-in/sign-up + mobile batch (no migration)

- **Remember me** on sign-in (default on). Unchecking sets an `mh:ephemeral` flag;
  on the next browser launch (no per-session marker) the app signs out. Works with
  the cookie-based Supabase session without changing client storage.
- **Mobile tabs reordered** — Search now sits right after Cigars (Home · Cigars ·
  Search · Humidor/Inventory · Lounges · Feed), both consumer and retailer bars.
- **Mobile settings menu** — a gear in the native top bar opens Account settings
  (`/account`), Notifications (`/settings`), and **Log out**.
- **More rating flavors** — the rating tasting-note chips expanded from 15 to ~36
  (espresso, oak, clove, toffee, molasses, barnyard, etc.).
- **Toolbar hidden on auth screens (mobile)** — `MobileTopBar` and `MobileTabBar`
  return null on `/register`, `/auth`, `/terms`, `/privacy`.
- **reCAPTCHA v2 on sign-up** (web + mobile). `Recaptcha` (explicit render, reliable
  in the webview) gates the signup submit; the token is verified server-side at
  `/api/recaptcha/verify` using `SECRET_reCAPTCHA_KEY`. Site key is hardcoded with a
  `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` override. If the secret is unset the route doesn't
  block signups; on a verify network error the client lets signup proceed.

Caveats: the reCAPTCHA verify call runs on Vercel's runtime (it can reach Google) —
it can't be exercised in the build sandbox. The "remember me" sign-out fires on the
next app/browser launch, not instantly on close.
## Retailer signup → verify → plan wizard (no migration)

Retailer signup now flows into a multi-step onboarding (retailers already land on
`/verify` after creating their account):
1. **Account** — lounge name + email + password (existing register step).
2. **Business details** (`/verify`) — verifiable details via `requestVerification`,
   now with a **"search and pre-fill"** box (queries `/api/stores`; picking a result
   fills the form and files an ownership **claim** via `submitClaim` so an admin can
   assign it), plus an optional **referral code** field (captured in the request
   notes as "Referral code: …" — the feature itself is for later).
3. **Plan** — after submitting details, a plan-selection step (PLAN_TIERS) → Stripe
   checkout if configured, else the free tier is applied (or "Start free for now").
   For a brand-new lounge still pending verification, the choice is recorded and
   applied once the lounge is approved/assigned.

No new tables — reuses `requestVerification`, `submitClaim`, and the billing lib.
## Chain display + staff RLS enforcement (run phase75.sql)

**Staff RLS enforced.** `can_manage_lounge_id(lounge_id, scope)` powers the policies:
- `inventory_items` — owner, admin, or staff with `can_inventory` may write.
- `lounge_posts` — existing members/admins, plus staff with `can_post`.
- `update_lounge_details` now allows staff with `can_edit` (via `can_manage_lounge`).
So the staff scopes set in the dashboard actually gate inventory/posting/edits now.

**Chains / other locations.** `approve_claim_request` now also creates (or reuses)
the requester's chain and stamps `chain_id` on every claimed lounge. The lounge page
shows an **"Our other locations"** row of sibling lounges (same `chain_id`).

Remaining tiny optional: a manual "group my lounges into a chain" control for owners
who didn't come through a bulk claim (auto-grouping covers the bulk-claim path).

> Run `supabase/migrations/phase75.sql` (after phase74).
## Group 3 part 2 + profile-removal sync (run phase74.sql)

**Profile removal now syncs.** `profiles.id` cascades from `auth.users`, so deleting
the *auth* user fully removes the account. The gap was deleting only the *profiles*
row — the auth user could still log in. Auth resolution now verifies the profile
exists on every state change (`verifyProfileExists`) and signs the user out if it's
gone. (To fully delete someone: delete their `auth.users` row, which cascades.)

**Chains / staff / multi-lounge (certified-only):**
- `lounge_staff` (can_post / can_inventory / can_edit) + dashboard **Staff access**
  manager: owner adds members by handle with scoped access, lists/removes them
  (`set_lounge_staff` / `remove_lounge_staff`). `can_manage_lounge(slug, scope)`
  helper is available to gate staff-permitted actions.
- `chains` table + `lounges.chain_id` for grouping locations (assignment/"other
  locations" display is the remaining lighter piece).
- **Bulk-claim → super-admin queue:** dashboard "Claim multiple lounges" inserts a
  `lounge_claim_requests` row (pending); a **Claim requests** admin tab
  (`ClaimRequestsQueue`) lets a **super_admin** approve (assigns every listed lounge
  to the requester + promotes them to retailer/owner via `approve_claim_request`)
  or reject. Approval is super-admin-only, enforced in the RPC.

Remaining lighter follow-ups: assigning lounges to a chain + showing "our other
locations", and enforcing staff scopes via RLS on inventory/posts (the helper exists;
the RPCs/owner checks are in place).

> Run `supabase/migrations/phase74.sql`.
## Nearby-lounge search — "Where to buy near you" (no migration)

On a cigar page, a **Where to buy near you** card shows **certified lounges within
25 miles that carry this cigar** (published inventory), each linking to the lounge
page with its address + the distance and price.

- Route `GET /api/cigars/{slug}/nearby?lat=&lng=` joins `inventory_items`
  (matched by slug, `published=true`) to `lounges!inner(...)`, keeps only
  `certified` lounges with coordinates, computes `haversineMi`, filters ≤25 mi,
  sorts by distance. Certified-only is enforced server-side.
- `WhereToBuyNearby` requests location only on tap (privacy) via the cross-platform
  `getUserLocation()` helper, so it works in the apps too (with the location
  permission strings added natively).

Notes: matches inventory by **slug**, so a lounge's items must carry the slug
(the add-to-inventory flow stores it). Currently surfaced on the cigar detail page;
inline "carried nearby" hints in the search list would be a follow-up (needs
per-result inventory lookups + location).
## Group 2 — Plans & billing (run phase73.sql)

A real **My Plan** page (`/dashboard/plan`): tier cards (Starter $49 / Pro $99 /
Premier $199 — shared in `src/lib/billing.ts`), current-plan highlight, upgrade/
switch buttons, a "Manage billing & invoices" button, and success/cancel handling.

**How payment is wired (graceful):**
- Choosing a tier calls `/api/billing/checkout`. If Stripe is configured it returns
  a Checkout URL and redirects; if not, it returns `{ fallback:true }` and the page
  applies the tier change directly (the existing free `set_cert_tier`) so the app
  is fully usable today.
- "Manage billing" → `/api/billing/portal` (Stripe billing portal) when configured.
- `/api/billing/webhook` verifies the signature and reconciles subscription state →
  lounge tier via `billing_set_tier_by_customer` (service role). Lounges gained
  `stripe_customer_id`, `stripe_subscription_id`, `plan_status`, `plan_renews_at`.

**To turn on real billing (your part — needs a Stripe account):**
1. Create 3 recurring Prices in Stripe (Starter/Pro/Premier).
2. Set server env vars in Vercel: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIER`.
3. Add a Stripe webhook → `https://www.myhumidor.shop/api/billing/webhook`
   (events: `customer.subscription.created/updated/deleted`).
4. Ensure `SUPABASE_SERVICE_KEY` is set (the webhook + owner checks use it).
Until those exist, the plan UI works for free via the direct tier change.

> Run `supabase/migrations/phase73.sql`.
## Group 5 — invites (run phase72.sql)

- **Invite links prefill the email.** Admin **Invites** tab (`InviteManager`)
  creates an invite (email + account type + "skip verification") → an `invites`
  row (random token) → a shareable link `/register?invite={token}`. The register
  page reads `?invite=` (or `?email=`), fetches `/api/invite/{token}`, and prefills
  the email + sets the account type, showing a "You've been invited" banner.
- **Manual invites skip the verification email.** On signup with a valid invite,
  the register page calls `/api/invite/accept` { token, userId }; the service-role
  client confirms the account (`auth.admin.updateUserById(..., email_confirm:true)`)
  after validating the token's email matches the new user, marks the invite
  accepted, and the page signs them straight in — no confirmation email.
- `signUpEmail` now returns `userId` so the accept step can target the new account.

**Requires `SUPABASE_SERVICE_KEY`** set as a server env var in Vercel (the existing
`supabaseService()` client) — without it, invited users fall back to the normal
verification email. Auto-emailing the invite link needs a mail provider (not wired;
the admin copies/sends the link for now).

> Run `supabase/migrations/phase72.sql`.
## Group 4 — discovery + removed account switcher (no migration)

- **Removed the Aficionado↔Retailer switcher** (it was confusing). The dropdown
  entry and `AccountSwitcher` are gone; the active type is always the account's
  real type, so actual retailer accounts still get retailer features (e.g.
  add-to-inventory) and consumers get the humidor — just no toggle.
- **Inventory picker now searches the live DB** (merges `catalog_cigars` via
  `searchCatalogCigarsRemote` with the static catalog), so recently-added cigars
  appear when building inventory.
- **Featured Brands** rail added to the home page (`featuredBrands()` +
  `FeaturedBrands`), rotating with the same cadence as featured cigars.
- **Flavor profile selector** added to cigar submission (up to 8 notes) →
  stored on `catalog_cigars.flavor_tags` when the cigar is pushed.
- **Catalog refresh cadence** increased: featured/browse rotation moved from
  daily to every 3 hours.
- **Cigar Concierge** is now conversational and never dead-ends: with no keyword
  match it recommends featured picks and asks a friendly follow-up instead of
  "I couldn't find…". The LLM prompt is warmer and accepts an optional `liked`
  list (the member's highly-rated cigars) for personalised recs.

### Deferred (group 4 leftover)
- **"Who carries it nearby (≤25 mi, certified)" on search/cigar pages** — needs a
  geo + inventory join + the user's location; its own focused pass.
- Wiring the concierge client to actually send the member's `liked` cigars (small
  follow-up; the API already accepts it).
- Featured Brands on the cigar detail page (added on home this pass).
## Group 3 (part 1) — lounge tooling (run phase71.sql)

- **Add to My Inventory from the cigar page.** Certified-lounge owners in retailer
  mode see "Add to My Inventory" instead of "Add to My Humidor" (`CigarPrimaryAction`).
  It opens a mini manager (price + quantity + "Publish to my shop now") that upserts
  one `inventory_items` row via `addOneToInventory` (keys on the catalog uuid; doesn't
  prune the rest of the menu). Non-certified / non-owners see the normal humidor button.
- **Opening hours** on the dashboard (`LoungeDetailsEditor`, per-day) → `lounges.hours_json`,
  shown as a structured schedule on the lounge page.
- **Food badge + menu PDF** (certified only): dashboard toggle + PDF upload (to the
  `submissions` bucket) → `lounges.serves_food` / `menu_url`; a "Serves food · View menu"
  line shows on certified lounge pages. Writes go through `update_lounge_details`
  (owner/admin, SECURITY DEFINER).

### Deferred to group 3 (part 2) — the chains/staff system
Still to build (it's a multi-table system, own session): chains / "see our other
stores", multi-lounge owners adding & self-assigning locations, staff roles with
access levels (posting/inventory/etc.), and bulk-claim requests routed to the
**super-admin** queue for approval. The `profiles.owns_multiple` flag (phase70) is
the entry point captured at signup.

> Run `supabase/migrations/phase71.sql`. (Earlier this session: phase69, phase70.)
## Group 1 — retailer/identity (run phase70.sql)

- **Combined retailer signup → plans.** Retailer signup now flows straight into certification: the email-confirm callback sends retailers to `/verify`, and the immediate (no-confirmation) path routes retailer *signups* to `/verify` while returning retailers still land on `/dashboard`. The "I own multiple lounges" checkbox was already wired (stored as `owns_multiple` in user metadata) for later multi-lounge config.
- **Account switch in Settings.** `/settings` now has an **Account** section: retailer-capable users (own a lounge or signed up as retailer, via `canRetail`) get a **Cigar Aficionado ↔ Retailer** toggle (`setAccountMode`); everyone else gets a "Link a retailer account" CTA → `/register?type=retailer`. The switch flips `Session.type`/`publicId` live.
- **Admin lounge controls** (Admin → Certify tab, `LoungeCertControl`): certify / **remove certification** (`admin_set_certification(slug,on)`, keeps `cert_tier` in sync) and **assign an owner by handle** (`admin_set_lounge_owner(slug,handle)` → sets `lounges.owner_id` and promotes that account to retailer/`lounge_owner`). Both are admin/super-admin only (SECURITY DEFINER + `_is_admin()`).

> Run `supabase/migrations/phase70.sql`.
## Group 1 — retailer/identity (run phase70.sql)

- **Account switching.** A single auth account can now act as both Aficionado and
  Retailer. `auth.ts` gained `baseType` (real type) + an active-mode override
  (`getAccountMode`/`setAccountMode`, localStorage), and `canRetail(uuid, baseType)`
  (true if they own a lounge or signed up as a retailer). The user dropdown shows an
  **AccountSwitcher**: retailer-capable users get "Switch to Retailer/Aficionado";
  plain consumers get "Link a retailer account" → /verify. Mode is cleared on sign-out.
  Ownership/RLS is unchanged (same auth.uid()), so dashboards/owner checks still work.
- **Admin: certify toggle + assign owner.** New admin tab **Cert & owners**
  (`LoungeOwnerControls`): grant/remove certification (`admin_set_certified`) and
  assign a lounge owner by member handle (`admin_assign_owner`), which converts that
  member to a retailer/lounge_owner account.
- **"I own multiple lounges"** checkbox on retailer signup → captured in user
  metadata (`owns_multiple`) + `profiles.owns_multiple` column for later multi-lounge
  setup.
- The separate verify signup is gone: retailers sign up once (consumer/retailer
  toggle) and verify/certify via **Plans**; the old Verify button was replaced by
  Plans + a My Plan dropdown entry in the previous batch.

> Run `supabase/migrations/phase70.sql`.
## Batch — dup fix, mojibake, usernames, toolbar/search (run phase69.sql)

- **Duplicate submissions (real fix):** `pushToCatalog` is now idempotent — it looks up an existing `catalog_cigars` row by brand+name (case-insensitive) and reuses it instead of inserting a second. Submit input is trimmed/space-collapsed. (Pre-existing dupes still need cleanup — see admin helper TODO.)
- **Mojibake names** ("Brian,Äôs" → "Brian’s"): `fixMojibake()` (src/lib/text.ts) is applied at catalog load (`allCigars`) so brand/name are clean everywhere server-side, plus belt-and-suspenders in `CigarName`. The /top ranked tiles now use `CigarName` (live join), so renames show there too.
- **Usernames:** handle now derives from **display name** (spaces/punct stripped), not email (phase69 `handle_new_user`). Signup **rejects taken usernames** via `handle_available(p_handle)` RPC before creating the account.
- **Toolbar:** removed **Inventory** (it's in the dashboard); **Verify → Plans** (links to certification plans) + new **My Plan** dropdown item (`/dashboard/plan`).
- **New Members** list excludes retailer accounts (consumer-only).
- **Lounge page:** website shows a "Website" hyperlink instead of the raw URL.
- **Search page:** reworded subtitle; **Popular searches** now rotate a random 7 from a larger pool each load.
- **Bottom tab bar** taller with safe-area bottom padding.

> Run `supabase/migrations/phase69.sql`.
## Fixes — search duplicates (root + display) + new-brand pages

**No migration.**

The remaining duplicate came from a submitted cigar matching a static one under a *different slug* (e.g. brand "Deadwood Tobacco Co." vs static "Deadwood Tobacco"), which dodged the slug-based checks. Fixed at two levels:
- **Display dedup is now by brand+name** (not slug) in the search dropdown (`SearchAutocomplete`), the full results page (`SearchClient`), and the brand page. This also collapses any *already-created* duplicate rows, so the visible double disappears immediately.
- **Prevention**: `/api/catalog-exists` now also matches a normalized **brand+name** against the static catalog (`cigarExistsByBrandName`), and `submitCigar` passes brand+name — so a duplicate can't be pushed even under a different slug.

**New-brand pages now render.** The brand page was pulling an unordered `limit(500)` from `catalog_cigars` and filtering in JS, so a new brand's cigar could fall outside the cap → 404. It now queries by **slug prefix** (`slug = {brand} OR slug ilike {brand}-%`), which targets exactly that brand's cigars regardless of table size, e.g. /brands/deadwood-tobacco-co.

> Existing duplicate rows in `catalog_cigars` are now *hidden* everywhere by the brand+name dedup, but the rows still exist. To physically remove them, use the admin Remove action (sets an override + best-effort delete) or a bulk CSV with `removed=true` on the `-xxxxxx`-suffixed slugs. I can add an admin "find duplicate catalog rows" helper if useful.

## Fixes — notification links + duplicate submissions

**No migration.**

- **Notifications are now tappable** and route to the right place: `notificationHref(n)` → submissions go to `/admin` (review queue), lounge posts/inventory/new-lounge/check-ins to `/lounges/{slug}`, follows to `/profile`, daily-top to the cigar or `/top`, system to home, and likes/comments to the cigar/lounge when a usable slug is present (uuid ids are skipped to avoid 404s). The bell renders each item as a link that closes the menu on tap.
- **Duplicate submissions fixed:** `submitCigar` only checked `catalog_cigars` for an existing cigar, not the large static catalog — so a cigar already in static got auto-approved and pushed as a new DB row, appearing twice (static copy + DB copy). It now also checks the static catalog via `/api/catalog-exists?slug=`; if the cigar already exists, it is not pushed again.

## Fix — duplicate email on signup (and a note on usernames)

`signUpEmail` now blocks registering an email that already exists. With Supabase email confirmation enabled, `auth.signUp` returns a *fake success* for an existing email (anti-enumeration): a user object with an empty `identities` array and no session, so the app was showing "check your email" and the person thought a new account was created. We now detect `data.user.identities.length === 0` and return "An account with this email already exists. Please sign in instead." (Confirmation-OFF already errors with "User already registered", which was surfaced.) No migration.

Usernames (handles) were already safe: `profiles.handle` is `unique not null` and the `handle_new_user()` trigger dedupes (`base`, `base1`, `base2`, …), so two signups can never share a handle. Handles are derived from the email local-part, not user-chosen, so there's no handle field to collide.

> Make sure Supabase Auth keeps **"Confirm email" ON** and isn't set to allow multiple identities per email; the client guard relies on the standard signUp response.

## Live-join cigar names (no rebuild, no re-save)

The snapshot propagation only runs when an override is *saved*, so edits made before phase67 (or rows with a null slug) kept showing the old name. Display now **live-joins** the name/brand from the catalog/overrides by slug — no migration.

- `/api/cigar-images` (the batched resolver behind `CigarThumb`) now returns full meta per slug: `{ url, brand, name, buyUrl, removed }`, merging `catalog_overrides` over the static catalog. `lib/cigar-images.ts` exposes `resolveCigarMeta`; `resolveCigarImage` kept for back-compat.
- New `CigarName` (modes name/brand/full) renders the live name, falling back to the snapshot until resolved.
- Wired into the **profile highlight** label, **humidor** rows (brand + name), and the **activity feed** rating rows ("reviews"). Search/brand/cigar pages already merge overrides server-side.

Net: renaming a cigar updates it everywhere on next view, even for edits saved before the propagation existed. (Re-saving still also rewrites the stored snapshots, which matters for CSV exports.)

## Phase 67 — Universal edits, brand pooling, bulk preview, brand CSV export, profile highlight fix

**Run `supabase/migrations/phase67.sql`** (after 66) — redefines `set_catalog_override` + `bulk_set_catalog_override` to **propagate** brand/name changes to the snapshot copies on `humidor_entries` and `ratings`. So renaming a cigar updates it on the profile highlight, the humidor list, and reviews — not just the cigar page. (Also fixes the mojibake'd old name once you re-save the correct one.)

- **Brand renaming pools correctly:** `/brands/[slug]` now groups by each cigar's *effective* (post-override) brand — cigars renamed into an existing brand show on that brand's page, and ones renamed away drop off. Page label/logo follow the pooled brand.
- **Bulk tool now has a validation/preview step:** uploading a CSV parses + scans it in-panel and shows a per-row table (OK / Check / Skip) with notes (missing slug, non-numeric price, bad URL, nothing-to-change, duplicate slug, unknown columns) before you click **Apply**. Only clean rows are sent.
- **Admin brand CSV export:** on a brand page, admins get **Download brand CSV** (slug + brand/name/country/price/image_url/buy_url) — a ready-to-edit file for the bulk tool (great for bulk image work on one brand).
- **Profile highlight no longer crops:** the humidor/smoked thumbnail rows had `overflow-x-auto` (which also clips vertical overflow); added vertical padding + larger tiles so the full thumbnail and hover ring show.

## Phase 66 — Catalog overrides: removals, inline edits, bulk CSV, purchase links

**Run `supabase/migrations/phase66.sql`** — adds `catalog_overrides` (slug-keyed: removed/brand/name/country/price/image_url/buy_url), `_is_admin()`, `set_catalog_override(...)`, `bulk_set_catalog_override(jsonb)`, and a `buy_url` column on `cigar_submissions`. Types updated.

**Why:** the browse catalog is large static JSON, so deleting a `catalog_cigars` row never removed a static cigar from the site. Overrides are merged **live** (server helper `lib/overrides.ts`, ~30s cache) so removals/edits/images/buy-links reflect on the front end.

- **Removal now works for any cigar:** the cigar-page "Remove" sets `removed=true` in overrides (+ best-effort DB delete). Removed cigars are filtered from the cigar page (404), search (`/api/cigars`), brand pages, `/top`, and the homepage.
- **Bulk = Supabase-direct sync:** the same override read path means rows you remove/edit in Supabase show up front-end within ~30s. Bulk edits are best done via the new admin tool rather than raw table edits, but both flow through the same merge.
- **Inline admin edit** (`CigarEditForm` on the cigar page): brand, name, origin, MSRP, purchase link → `set_catalog_override`.
- **Bulk catalog tool** (admin → "Bulk catalog"): **download a CSV template**, fill it (slug + any of brand/name/country/price/image_url/buy_url/removed), **re-upload** → `bulk_set_catalog_override` in 500-row chunks. Ideal for bulk image updates.
- **Purchase links:** a "Buy from the brand" button shows on the cigar page when set. Users can include a link when submitting (`SubmitCigar` → `cigar_submissions.buy_url`; auto-approved lounge submissions also set the override); admins can add/change it via the inline edit or bulk CSV.

> Note: overrides apply on browse surfaces; a removed cigar already sitting in a user's humidor isn't force-removed from their personal collection. Image-only bulk updates use the existing image hierarchy (override image_url is the product layer).

## Brand pages — navigate from a cigar to all of its brand's cigars

The `/brands/[slug]` route already existed (lists every cigar for a brand via `cigarsByBrand`, merging DB-submitted cigars); the missing piece was navigation. No migration.

- The **brand name on the cigar page is now a link** to `/brands/{brandSlug(brand)}`.
- The **"More from {brand}" row** on the cigar page gained a **"View all →"** link to the brand page (new optional `href` prop on `CigarRow`).
- The brand page now shows a **brand logo header** (`BrandLogo`) and **image thumbnails** on each cigar card (`CigarThumb`), consistent with the rest of the site and the image hierarchy.

## Image sync across thumbnails (product → brand → fallback everywhere)

Admin image changes now propagate to every thumbnail, not just the cigar detail page. No migration.

- **Batched resolver:** new `POST /api/cigar-images { slugs }` resolves a whole list in one request — product (`catalog_cigars.image_url` overwrite ?? static catalog image) ?? brand (`brand_images`) ?? null. Client module `lib/cigar-images.ts` collects slugs per tick + caches; `CigarThumb` paints `src` immediately then swaps in the resolved image.
- **Hierarchy bug fixed:** `/api/brand-logo` now treats a cigar's **static** image as a product-level image too, so a brand image never overrides a cigar that already has its own artwork (affected the detail page + profile highlight).
- **Wired CigarThumb / slug-aware BrandLogo into:** homepage (carousel + list), `/top`, `TopCigarsSections`, the **humidor** rows (which previously showed only a placeholder — now show the real image), the **profile** collection highlight, **lounge inventory** rows (`LoungeMenu`, previously image-less), `RecentlyAdded`, and `CigarRow` (More-from-brand / Similar). Search results stay text-only (no thumbnail by design).

So overwriting a cigar's image (or setting a brand image) shows up in the humidor, homepage, Top, profiles, and lounge menus after refresh.

## Phase 65 — Image hierarchy (product → brand → fallback) + brand-by-URL + file types + live refresh

**Run `supabase/migrations/phase65.sql`** (adds `brand_images` table; **replaces** `set_brand_image` with a 2-arg `set_brand_image(p_brand, p_url)` that upserts the brand image instead of writing into cigar rows). Regenerate types or note: `database.types.ts` updated (brand_images table, 2-arg set_brand_image).

- **Hierarchy:** `/api/brand-logo?brand=&slug=` now resolves **product** (`catalog_cigars.image_url` by slug) → **brand** (`brand_images`) → **logo.dev/CSE** → monogram. `BrandLogo` takes a `slug` and resolves live for cigars.
- **"Doesn't change straight away" fixed:** the product/brand layers are read **live from the DB** (only external logo.dev results are cached), so an admin upload/overwrite shows on refresh. Uploads also use a unique path so the CDN never serves a stale copy.
- **Brand image by URL:** admin control supports source = Upload **or** Image URL × scope = This cigar (`set_cigar_image`) or Whole brand (`set_brand_image`). Brand-by-URL works.
- **File types:** uploads accept and preserve **.svg/.png/.webp/.jpg/.gif/.avif** (correct extension + content-type, no more forced .jpg); URL links accept any image URL.

## Phase 64 — Admin cigar/label image: upload or URL, per-cigar or brand

**Run `supabase/migrations/phase64.sql`** (adds `set_cigar_image(p_slug, p_url)` — SECURITY DEFINER, admin-only, **overwrites** that one cigar's `image_url`).

The admin image control on a cigar page (`CigarImageUpload`) now supports:
- **Source:** direct **file upload** (stored in the `avatars` bucket under `cigar-art/`) **or paste an image URL** (stored as-is).
- **Scope:** **This cigar** (overwrites just this entry via `set_cigar_image`) or **Whole brand** (fills all same-brand cigars + this one via `set_brand_image`).
- Plus the existing one-click **logo.dev autofill**, which respects the chosen scope.

Added the `set_cigar_image` signature to `database.types.ts`.

## Phase 63 — Lounges vs retailers (venue type)

**Run `supabase/migrations/phase63.sql`** (adds `lounges.venue_type` ∈ {lounge, retail, both}, default 'lounge', + `set_venue_type(slug, type)` RPC: owner-or-admin only).

- Distinguishes **sit-down lounges** (smoke on-site) from **retailers** (liquor/big-box stores that sell cigars but aren't smoking venues — Total Wine, ABC, Spec's, etc.).
- New `VenueTag` shows on lounge cards and the lounge detail header; retailers get a clear notice ("cigars sold here, but not a sit-down lounge — call ahead").
- Lounges **directory has a filter**: All / Sit-down lounges / Retailers (`LoungeDirectory`).
- **Owners set their venue type** from the dashboard (`VenueTypeControl` → `set_venue_type`); admins can also set it (RPC allows admin).
- **Static catalog pre-tagged:** a heuristic marked **273 / 728** stores as `retail` (liquor/grocery/big-box chains by name); the rest default to lounge. Added `venue_type` to the generated `lounges` types + `CatalogStore`.

> The static tagging is heuristic (name-based) and imperfect — owners/admins can correct any entry via the controls above, and member-submitted lounges default to 'lounge' until set.

## logo.dev brand-logo autofill

`/api/brand-logo` now resolves logos in order: **logo.dev** (search the brand via the secret key server-side → `https://img.logo.dev/<domain>?token=<publishable key>`) → Google CSE → monogram fallback. Accepts an optional `&domain=` to skip the search. Because `BrandLogo` already calls this endpoint, every cigar/brand without its own artwork now auto-pulls a logo.dev logo. Admins also get an **"Autofill from logo.dev"** button on the cigar page (next to Upload) that persists the fetched logo to the brand via `set_brand_image`.

**Env vars (set in Vercel + `.env.local`; see `.env.local.example`):**
- `LOGODEV_PUBLISHABLE_KEY` — `pk_…` (safe to expose; ends up in image URLs)
- `LOGODEV_SECRET_KEY` — `sk_…` (server-only; brand search). **Do not commit.**

> ⚠️ The secret key was shared in plaintext — rotate it in the logo.dev dashboard and set the new value in Vercel env, not in code.

## Fix — public profile id mismatch (follows/socials/activity) + cigar reviews

**Public profile sync:** follows (`follows.follower_id/followee_id`), profile socials (`profiles.id`), and check-ins (`check_ins.user_id`) are all keyed by the auth **uuid**, but `/u/[handle]` was passing `viewedId` (the **public_id**, `USER-…`) to `FollowStats`, `ProfileSocialLinks`, and `ActivityFeed` — so they came back empty. Now all uuid-keyed components receive `viewedUuid` (the real `profiles.id`); only `AdminOnlyId`, which *displays* the public id, keeps `viewedId`. Humidor/smoked already used the uuid via `fetchCollectionFor`. (Same root cause as the badges fix.)

**Cigar pages — community reviews:** new `fetchCigarReviews(slug)` reads the public `ratings` table joined to `profiles` (handle, name, avatar, aficionado), and a `CigarReviews` component lists every member's review (score, F/B/A, tasting-note chips, written notes, photo, date, avg + count, "show all"). Added below "Photos of this cigar". No migration — relies on the existing `"ratings are public" for select` policy.

## Fix — badges missing on public profile

On `/u/[handle]`, `BadgesSection` was passed `viewedId`, which is the member's **public_id** (`USER-…`). But badges live in `user_badges` keyed by the auth **uuid**, so `earnedBadgeIds(publicId)` matched nothing and the badges case rendered empty (own `/profile` worked because it passes `session.uuid`). Added a `viewedUuid` state (the real `profiles.id` / `found.userId`, or `session.uuid` for self) and pass that to `BadgesSection`. `user_badges` already has a public-read RLS policy, so other members' earned badges now show. No migration.

## Phase 62 — Admin verifies Aficionados + elevated profile banners

**Run `supabase/migrations/phase62.sql`** (adds `set_aficionado(p_handle, p_on)` — SECURITY DEFINER, admin-only).

- **Admin → Verify members tab:** new admin tab (crown icon) with a member search (reuses `/api/users`, which already returns `aficionado`). Each result shows current status with a **Verify as Aficionado** / **Revoke** toggle calling `set_aficionado`. Added the RPC to `database.types.ts`.
- **Elevated top banners:** new `EliteBanner` component renders a distinctive gradient/glow strip at the top of a profile/lounge page. Shown for **Verified Aficionado** members (gold treatment, crown) on `/profile` and `/u/[handle]`, and for **Certified** lounges (teal-accented, badge-check) on `/lounges/[slug]`, so elevated accounts read as clearly special versus regular members and lounges.

## Humidor removal confirmation dialog

Added an "Are you sure you want to remove this cigar from your humidor?" confirm dialog on the humidor page. The Remove (trash) button now opens a modal naming the cigar; confirming calls the same removal path, which deletes by the humidor_entries **primary key** (phase61 `remove_humidor_entry_by_id`). The diagnostic query confirmed entries are correctly owned (`user_id = profiles.id = auth.uid()`), so the by-id delete should match — the dialog is a UX layer, not the fix for the delete itself.

## Phase 61 — Delete humidor entry by primary key + diagnostic

**Run `supabase/migrations/phase61.sql`.** Even a `(auth.uid(), cigar_id)`-scoped SECURITY DEFINER delete kept matching 0 rows, so removal now targets the row's own **primary key**. `humidor_entries.id` is now selected into the collection cache (`entryId`); `remove` deletes via `remove_humidor_entry_by_id(p_id)`, falling back to the cigar_id RPC then a direct delete. The RPCs now **return the deleted row count**, and the client logs loudly when a delete matches 0 rows (instead of failing silently).

A confirmation dialog would NOT fix this — the delete reaches the DB and matches nothing; the dialog only changes the UX before the same call.

### Diagnostic — why a delete matches 0 rows
If cigars still persist after running phase61, the stored `user_id` likely isn't your `auth.uid()` (rows written under a different id). Run this in the Supabase SQL editor to see the actual rows (note: `auth.uid()` is null in the SQL editor, so we join to profiles instead):

```sql
select he.id, he.user_id, he.cigar_id, he.status, p.handle, p.public_id
from public.humidor_entries he
join public.profiles p on p.id = he.user_id
order by he.created_at desc
limit 20;
```

Compare `he.user_id` to your own `profiles.id`. If they differ, the entries were written under the wrong id and the fix is to correct how `user_id` is set on insert (it should be `auth.uid()`), then re-point existing rows. Send me the (anonymised) output and I'll pinpoint it.

## Phase 60 — Humidor removal via SECURITY DEFINER RPC + profile humidor link

**Run `supabase/migrations/phase60.sql`.** The direct DELETE was matching 0 rows on the live DB (cigar reappeared on refresh) — the live RLS delete policy wasn't actually permitting it. phase60 adds `remove_humidor_entry(p_cigar_id uuid)` (SECURITY DEFINER — deletes `where user_id = auth.uid()` regardless of policy config) and also (re)asserts a `for delete using (auth.uid() = user_id)` policy. `persistRemove` now calls the RPC, falling back to a direct delete if the RPC isn't present. Added the RPC signature to `database.types.ts`.

- **Profile → humidor link:** the "In your humidor" panel on the profile now has a **View →** link to `/humidor` (own profile only).

## Fix — removed items reappearing after refresh

Symptom: removing a cigar (or rating) updated the UI instantly, but after a refresh it came back — i.e. the **DB delete never persisted**, so the next hydrate re-fetched the row.

Root cause: the delete bailed on a null/stale module-level `userId` (`if (!userId) return;`) — the optimistic cache update + event still fired, so the UI looked correct, but no delete query was ever sent. (`getSession()` also returned `null` in Supabase mode, so there was no fallback.)

Fixes:
- `auth.getSession()` now returns the **resolved live session** in Supabase mode (was hard-coded null), giving a real synchronous user-id fallback.
- `humidor_entries` and `ratings` deletes are now **RLS-scoped** — delete by `cigar_id` / rating `id` only and let the `auth.uid() = user_id` policy restrict to the user's own row, with no dependency on the module `userId`. Inserts/upserts resolve `userId ?? getSession()?.uuid` before writing.

No new migration. (Relies on the existing "users manage own humidor/ratings" RLS policies, which already cover delete.)

## Phase 59 — Append-only ratings + profile collection fix

**Run `supabase/migrations/phase59.sql`** (drops the `unique(user_id,cigar_id)` constraint on `ratings`).

- **Ratings are now append-only.** Users can **add** or **remove** a rating, never amend it. Rating the same cigar again later is a brand-new rating (its own row + id). `persist` switched from `upsert(onConflict:user_id,cigar_id)` to `insert` with a client-generated `id`; added `removeRating(id)` / `persistDelete`. The rating form no longer pre-fills an existing rating, and a new **"Your rating(s)"** block on each cigar page lists the user's ratings with a Remove (trash) button. Each rating still moves the cigar to "Smoked".
- **Removed-from-humidor cigars lingering on the profile — fixed.** The profile was re-fetching the collection from the DB on every change, which raced the in-flight delete and read the row back. The own-profile now reads the **live local store** (`getCollection`/`getRatings`) — optimistic + realtime-synced — so removals disappear immediately. (The public `/u/[handle]` view still fetches other members' data from the DB, which is correct.)

## Fix — pages still hanging + collection not updating live

**Hanging humidor/admin (root cause):** every component called `subscribeAuth`, and each one registered its *own* `onAuthStateChange` on the shared client **and** raced a `getSession()` promise. On the single shared client that meant many awaited callbacks per auth event plus a per-page getSession that could stall under lock contention — pages sat on "checking".
Fix: `subscribeAuth` now uses **one** client `onAuthStateChange` listener that fans out to a Set of subscribers. No per-subscriber getSession call (the listener's `INITIAL_SESSION` resolves the initial state). Late subscribers get the current session synchronously once resolved, and never receive a premature `null` (which had been bouncing pages to /register). The humidor 6s Reload fallback stays as a backstop.

**Collection not updating in real time:** added a Supabase **realtime subscription on `humidor_entries`** (in `collection.ts` `start()`); any add/remove/move — from this tab, another tab, or another device — re-hydrates the cache and fires the change event, so the humidor list, counts, and Aging Tracker update live. The optimistic local update on remove/move is unchanged; this makes it authoritative and cross-session. (Requires `humidor_entries` in the `supabase_realtime` publication — see note below.)

> If live updates don't appear, ensure realtime is enabled for the table:
> `alter publication supabase_realtime add table public.humidor_entries;`

## Fix — admin reload loop + can't-log-out (auth lock)

Root cause: the previous fix swapped the Supabase auth lock for a **fully pass-through** lock, which removed *all* serialisation of auth operations. That let `autoRefreshToken` race:
- a refresh re-establishing the session right after `signOut()` → **couldn't log out**;
- refresh-token rotation racing itself → spurious `SIGNED_OUT` events → the admin page's `subscribeAuth` saw a null session, redirected to `/register`, the session was then restored, and it bounced back → **constant reload loop**.

Fix: use Supabase's exported **`processLock`** (in-memory, single-tab serialisation) instead of pass-through. It still prevents the cross-tab `navigatorLock` deadlock that originally froze the humidor, but restores proper serialisation so refresh can't race sign-out or itself. `signOut()` simplified to a single `auth.signOut()` (global scope already clears local). No in-page reload triggers exist; the loop was purely auth-state thrash.

## Generated Supabase types wired; SbRow removed

- Dropped in the generated `src/types/database.types.ts` and parameterised all three client factories — `createBrowserClient<Database>`, `createServerClient<Database>` (SSR + service) — so `data`, inserts, updates, and `.rpc()` calls are now fully typed against the live schema.
- **Deleted `src/types/sb-row.d.ts` and every `SbRow` cast.** Reads are type-checked for real now.
- The typed client caught (and we fixed) real latent issues: `audit_events.meta`/`lounges.socials`/`profiles` update payloads now cast through the generated `Json`/Update types, and **`lounges.address` is NOT NULL in the live DB** — the lounge-submission insert was passing `null`, now sends `''` (would have failed at the DB on certain submissions).
- `db:types` script uses `npx supabase …`; re-run after any schema change to refresh `database.types.ts`.

## Phase 57 — Fix cigar-approval crash + Supabase types workflow

- **Bug fixed:** approving a cigar submission threw `null value in column "id" of relation "catalog_cigars"`. That table's `id` was a uuid PK with **no default** (unlike every other table), so it relied entirely on the client supplying one. Added `supabase/migrations/phase57.sql` to set `id default gen_random_uuid()`, and hardened the client (`newUuid()` falls back to a manual v4 if `crypto.randomUUID` is unavailable). **Run phase57.sql.**
- **Supabase generated types:** added the `supabase` CLI dev-dependency and a `db:types` npm script (`npm run db:types` → `src/types/database.types.ts`). See `docs/SUPABASE_TYPES.md`. Generation must be run by someone with project access (needs the live DB / access token — can't be done in the build sandbox), after which the typed client is wired and `SbRow` removed. Until then `SbRow` stays so the build is green.

## Supabase client upgrade + deadlock fix

- **Upgraded** `@supabase/ssr` 0.5 → 0.12 and `@supabase/supabase-js` 2.45 → 2.108.
- **Root-cause fix for the humidor hang:** `supabaseBrowser()` was creating a *new* client on every call, so many GoTrueClient instances contended for the same Web Locks entry — the deadlock that froze the humidor on tab refocus. It's now a **singleton** (one client per tab) and uses a **pass-through auth lock** (`lock: async (_n,_t,fn) => fn()`) instead of the default `navigatorLock`, removing the cross-tab lock contention entirely. The 6-second timeout/Reload fallback on the humidor page stays as a belt-and-braces safety net.
- The newer supabase-js types stopped inferring `data` from queries; resolved across the data layer with a shared loose row type (`SbRow` in `src/types/sb-row.d.ts`) cast onto query results, with concrete shapes where objects are built into domain types. Build is fully green (types + lint + all routes).

**Live profile reads (user search autocomplete):** needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` only — it reads the public `profiles` table under the existing `"profiles are public" for select using (true)` RLS policy. No service key required.

## Fixes — humidor loading, aging-tracker scope, user autocomplete, profile highlight

- **Humidor stuck-loading fixed:** the page waited on `subscribeAuth` with no escape, so a stalled `getSession()` (token refresh deadlocking on tab refocus) left the spinner forever. Now auth resolution has a 6s timeout that surfaces a "taking longer than usual… Reload" button instead of hanging, and the subscription is cleaned up properly.
- **Aging Tracker = humidor only:** the component now filters to `status === 'humidor'` internally, so wishlist and already-smoked cigars can never appear (both call sites already passed humidor-only, this guarantees it).
- **User autocomplete in the toolbar:** new `/api/users` (matches handle or display name over the public `profiles` table); the search dropdown now lists matching members first (with @handle, location, Aficionado tag) linking to `/u/{handle}`.
- **Profile collection highlight:** a new top-of-profile strip shows "In the humidor" and "Smoked" with counts + thumbnail rows, on both the owner profile and the public `/u/{handle}` view.

(No new migration — uses existing tables.)

## Phase 32 — Smoking vs keeping, review photos + check-in, cigar-page sections, admin archive

**Run `supabase/migrations/phase32.sql`** (humidor_entries status adds 'smoked'; ratings gain photo_url + lounge_slug; adds admin-checked `set_brand_image` RPC). Photos use the existing `avatars` storage bucket (paths `rating-photos/` and `brand-art/`).

- **Smoking vs humidor split:** adding to humidor = saving (unchanged). **Rating a cigar now means you smoked it** — on submit it's moved to a new **Smoked** list (out of humidor), for both humidor cigars and one-off reviews. `markSmoked()` force-sets status='smoked'. Humidor page gains a Smoked filter + count; the "in humidor" stat excludes smoked.
- **Optional lounge check-in on a review:** the rating form has a lounge search ("Smoking at a lounge?") that's fully skippable; on submit, a selected lounge fires `createCheckIn`.
- **Review photos + "Photos of This Cigar":** ratings can include a photo (uploaded to storage); each cigar page shows an endless auto-scrolling carousel of all member photos for that cigar (`fetchRatingPhotos` → `CigarPhotos`), rendering nothing until one exists.
- **More from {Brand} + Cigars similar to this:** two endless carousels on every cigar page. `moreFromBrand` = same brand; `similarCigars` = tag-overlap (×3) + same country (×2) + price proximity, other brands only, max 1 per brand.
- **Admin brand artwork on the cigar page:** admin-only uploader under the cigar image; uploads art and applies it to that cigar + every same-brand catalog cigar lacking an image via `set_brand_image`.
- **Admin submission archive:** decided cigar submissions older than 7 days drop out of "Recently decided" into a collapsible **Archive** (uses `reviewed_at`, now selected; falls back to `created_at`).

## Tweak — hero collage removed, Aging Tracker on Humidor

- Removed the brand-artwork collage from the homepage hero (back to the single-column headline with glow + stats strip; smoke animation CSS cleaned up).
- The **Aging Tracker** now also renders on the Humidor page ("My collection" view, above the filters), tracking the same humidor items with the Aficionado gating it has on the profile.

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
