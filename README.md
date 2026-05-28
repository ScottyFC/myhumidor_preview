# MyHumidor by CigarTV

A premium cigar rating, collection, and discovery platform. Built with Next.js
14, Supabase, and the CigarTV MRSS feed.

## What's wired up

- **`/`** — Editorial home page with the latest episodes pulled live from your MRSS feed.
- **`/watch`** — Episode grid grouped by series (8 series, 191 episodes from your feed).
- **`/watch/[guid]`** — Individual episode page with HTML5/HLS player, featured-cigar
  lower-third overlay, multilingual subtitle tracks, and a persistent sidebar.
- **`/live`** — The public 24/7 CigarTV linear feed (Amagi HLS) that consumers can watch.
  No viewership data is shown here — that's private to lounge owners.
- **`/dashboard`** — Private lounge-owner view: viewership for **their own location only**
  (viewers now, watch-hours, 7-day trend, credits today, credit balance, and a credit ledger).
  In production it's gated by auth + RLS so an owner only sees their lounge.
- **`/humidor`** — Personal collection view with status filters (mock data).
- **`/cigars/[slug]`** — Cigar detail page with community averages and the three-axis rating form.
- **`/lounges`** — The Lounge Program pitch page.
- **`/map`** — Cigar Maps (renders Mapbox if you set `NEXT_PUBLIC_MAPBOX_TOKEN`, otherwise
  shows a styled placeholder + lounge list).
- **`/api/episodes`** — JSON API exposing the parsed catalog (for mobile and TV clients).
- **`supabase/schema.sql`** — Full Postgres schema with RLS policies, triggers that
  maintain rating aggregates, PostGIS for geo queries on lounges, and a seeded badge
  taxonomy.

## Quickstart (local)

```bash
# 1. Install
npm install

# 2. Copy env (works without filling anything — falls back to /public/feed.xml)
cp .env.example .env.local

# 3. Run
npm run dev
```

Open http://localhost:3000.

The MRSS feed is bundled at `/public/feed.xml` so you can demo without any backend.
Once you're hosting the live channel manifest, set `NEXT_PUBLIC_MRSS_URL` in
`.env.local` and the watch pages will pull from there with a 1-hour cache.

## Connect Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste `supabase/schema.sql` → run.
3. **Settings → API** → copy the URL and anon key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Mock data in `src/lib/mock-data.ts` mirrors the production schema — swap the
   reads for Supabase queries one page at a time.

## Connect Mapbox

1. Create a free account at [mapbox.com](https://account.mapbox.com).
2. Copy your public access token into `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`.
3. `/map` will render a dark-themed interactive map.

## Deploy

See [docs/HOSTING.md](docs/HOSTING.md) for the recommended stack and step-by-step
deploy instructions for Vercel + Supabase.

## Project structure

```
src/
├── app/
│   ├── api/episodes/       JSON catalog API
│   ├── cigars/[slug]/      Cigar detail + rating
│   ├── humidor/            Personal collection
│   ├── lounges/            Lounge Program pitch
│   ├── map/                Cigar Maps
│   ├── watch/              Episode grid
│   ├── watch/[guid]/       Individual episode player
│   ├── globals.css         Brand styles, fonts, film grain
│   ├── layout.tsx          Fraunces + Geist + Nav wrapper
│   └── page.tsx            Editorial home
├── components/
│   ├── CigarCard.tsx       Humidor / search list item
│   ├── EpisodeCard.tsx     Watch grid card
│   ├── Nav.tsx             Top + mobile bottom nav
│   ├── RatingForm.tsx      Three-axis rating UI
│   ├── RatingStars.tsx     Display-only stars and bars
│   └── VideoPlayer.tsx     HTML5 player with featured-cigar overlay
├── lib/
│   ├── mock-data.ts        Cigars, lounges, humidor (until Supabase is wired)
│   ├── mrss.ts             MRSS feed parser
│   ├── supabase.ts         Browser + server Supabase clients
│   └── utils.ts            cn(), date, computeOverall
├── types/
│   └── index.ts            Shared TypeScript types
supabase/
└── schema.sql              Full Postgres schema
public/
└── feed.xml                Your CigarTV MRSS feed (for local dev)
docs/
├── HOSTING.md              Deploy guide
└── ROADMAP.md              What's next
```

## Brand direction

The aesthetic is **after-hours editorial**. Dark by default, warm tobacco palette,
serif display (Fraunces) paired with a modern sans (Geist). The body has a subtle
film-grain overlay and the rules between sections use a cigar-band gradient. Numbers
get tabular figures and italic display serif for that magazine look.

Tailwind tokens:
- `ember` (50–900) — the brand amber ramp
- `leather`, `leather-dark`, `leather-deep` — tobacco browns for cigar imagery
- `smoke` (50–900) — warm grays for text and surfaces
- `char` — deepest background
- `paper` — primary text color

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database / Auth / Storage | Supabase (Postgres + PostGIS) |
| Video CDN | AWS CloudFront (your existing feed) |
| Maps | Mapbox GL JS |
| Player | HTML5 video + hls.js (VOD and the live Amagi channel) |
| Icons | Lucide React |
| Fonts | Fraunces (display) + Geist (body), both self-hosted via npm — no Google Fonts fetch at build |

## License

Proprietary — CigarTV / MyHumidor. All rights reserved.
