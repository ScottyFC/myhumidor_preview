# Roadmap

What was scaffolded, what's next, and roughly in what order.

## What ships now (v0.1)

Everything you can run today with `npm run dev`:

- Editorial home page pulling latest episodes from your MRSS feed
- Watch grid grouped by all 8 series (191 episodes)
- Individual episode player with featured-cigar overlay
- Humidor view with mock collection and status filters
- Cigar detail with community averages + three-axis rating form
- Lounge Program pitch page at `/lounges`
- Mapbox-powered Cigar Maps (or styled placeholder without a token)
- JSON catalog API at `/api/episodes` for future mobile/TV clients
- Full Supabase schema with RLS, PostGIS, and seeded badges

## Phase 1 — Make it real (Weeks 1–4)

The MVP that you can show to actual users.

### Auth
- Wire Supabase magic-link email auth into `Nav.tsx` (replace the placeholder "Sign in" button)
- Create `/auth/callback` route to handle the redirect
- Build `/profile` for handle / display name / avatar
- Gate `RatingForm.tsx`'s submit on `auth.uid()` instead of `console.log`

### Real cigar database
- Decide sourcing strategy (see ERD discussion: build wiki, license, or scrape-and-reconcile)
- Build an admin-only `/admin/cigars` page to bulk-import a starter catalog (target: 500 SKUs)
- Add full-text search across `brand + line + vitola` using Postgres `tsvector`
- Replace `MOCK_CIGARS` in `src/lib/mock-data.ts` with Supabase queries
- Replace `MOCK_HUMIDOR` and `MOCK_LOUNGES` similarly

### Featured cigars
- Build `/admin/episodes/[guid]/featured` for the editorial team to tag cigars at timecodes
- Use the existing `cuePoints` from the MRSS feed as auto-suggested timecode markers
- The `VideoPlayer.tsx` overlay already supports multiple `featured_cigars` per episode — just needs the real data

### Onboarding
- Age gate on first visit (21+ — required for tobacco in the US)
- First-time tutorial: rate one cigar, add one to humidor, follow one lounge

## Phase 2 — The Lounge Program goes live (Weeks 5–12)

This is where the business model kicks in.

### Lounge dashboard at `/dashboard`
- Inventory CRUD (with a barcode-scan workflow for the iPad — most lounges already have one at the register)
- Credit balance + ledger view
- Ad campaign builder (boost in nearby search, featured pin, etc.)
- Viewership analytics from the TV stick

### Lounge claim flow at `/lounges/claim`
- Search for existing lounge or create new
- Upload business license + storefront photo
- Verification queue you process manually for the first 100 lounges, then automate

### TV stick app
- Start with the easy path: Fire TV Stick or Roku app that's a Chromium kiosk pointed at `/tv/[lounge-id]`
- Build that route as a 16:9 always-on display matching the mockup (CigarTV stream + lounge menu sidebar + featured cigar lower-third)
- Ship 10 sticks to friendly lounges in Tampa as the alpha
- Implement viewership reporting back to `viewership_events` table (already in the schema)

### Credit economy
- Crontab job that converts daily viewership minutes into credits (in `credit_ledger`)
- Daily cap to prevent gaming (24-hour rolling window)
- First ad placement: boosted lounge pin on Cigar Maps within 5mi radius

## Phase 3 — Mobile + community (Months 4–6)

### Mobile app
- Expo + EAS, sharing as much code as possible with the web (`@/types`, `@/lib/utils`, the API routes)
- Three-axis rating in native UI (haptics on each star tap)
- Episode playback via expo-av
- Push notifications for "new episode features a cigar in your humidor"

### Social
- Public ratings feed at `/feed` with comment + like
- Follow other users
- Lounge profile pages with member check-ins
- Badge taxonomy expanded (the schema already seeds 9 — add 30 more for engagement loops)

### Search
- Migrate Postgres `tsvector` to Algolia or Meilisearch once query volume justifies
- Faceted filters: country, wrapper, vitola, price range, community rating

## Phase 4 — Revenue (Month 7+)

### Brand sponsorships
- New table: `brand_sponsorships` with multiplier rules
- "Padron Month" → all Padron ratings during May earn 2x credits for lounges that stock them
- Brand-funded promo budget flows back into `credit_ledger` so the economy stays closed-loop

### Premium tiers (consumer)
- Free: unlimited ratings, basic humidor, Cigar Maps
- Plus ($4.99/mo): unlimited humidor with multi-humidor support, aging projections, export to CSV, ad-free
- Aficionado ($14.99/mo): everything in Plus + exclusive episodes + early access + custom badges

### Affiliate revenue
- "Buy this cigar" links to Cigar.com / JR Cigars / Atlantic Cigar with affiliate codes
- Surface only when a cigar isn't available at any nearby verified lounge (keeps the lounge program incentive-aligned)

## Phase 5 — The platform play (Year 2+)

### Open the API
- Public read-only API for the cigar catalog (with rate limits)
- Lounge POS integrations: pulled inventory from Square, Clover, Lightspeed
- TV stick SDK for third-party hardware partners

### International
- The MRSS feed already ships with EN/ES/DE/PT subtitles — add localized UI
- LATAM cigar maps (Dominican Republic, Nicaragua, Honduras production tour content already in `UNROLLED`)
- EU compliance: cookie consent banner, GDPR data export, age gating per country

## Known issues / cleanup

- Real auth not wired — `RatingForm.tsx` just `console.log`s submissions
- Mock data in `src/lib/mock-data.ts` needs to be swapped for Supabase queries
- The MRSS feed's CloudFront URLs are `http://` — `mrss.ts` upgrades to `https://` but you should confirm your CloudFront distribution supports HTTPS
- `cuePoints` from the feed aren't yet used in the player — wire them up for chapter markers and the editorial team's featured-cigar tagging workflow
- The `/live` viewership numbers are mock telemetry — wire them to the `viewership_events` table once TV sticks are reporting in
