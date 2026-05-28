# Hosting

Recommended stack for launching MyHumidor by CigarTV. Optimized for fast time-to-market, low ops overhead, and a clear scaling path.

## Recommended stack

| Layer | Service | Free tier | Paid (when you grow) |
|---|---|---|---|
| Domain | Cloudflare Registrar | — | ~$10–14/yr |
| Frontend | Vercel | Generous hobby tier | $20/mo (Pro) |
| DB + Auth + Storage | Supabase | 500 MB DB, 1 GB storage, 50K MAU | $25/mo (Pro) |
| Video CDN | AWS CloudFront | Your existing setup | Pay-per-GB |
| Maps | Mapbox | 50K loads/mo | $0.50/1k after |
| Email (later) | Resend | 3K/mo, 100/day | $20/mo (50K) |
| Analytics (later) | PostHog Cloud | 1M events/mo | $0.00031/event after |

**Realistic launch cost: ~$50–60/month** before you exceed free tiers. Most of that is the Vercel Pro plan once you outgrow hobby (typically when you cross ~100GB/month bandwidth).

## Domains

Buy from [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) — they sell at wholesale (no markup), include free DNS, and have one-click integration with Vercel.

**Get all three** to protect the brand:
- `myhumidor.app` — primary. `.app` forces HTTPS at the TLD level, which is a nice security baseline.
- `myhumidor.com` — if available, point it at the same Vercel project as a redirect.
- `myhumidor.tv` — defensive registration, redirect to primary.

Total: ~$40/year for all three.

## Deploy to Vercel

```bash
# 1. Push your code to GitHub
git init
git add .
git commit -m "Initial scaffold"
gh repo create myhumidor --private --source . --push

# 2. Install Vercel CLI and deploy
npm i -g vercel
vercel link
vercel
```

Or use the dashboard: [vercel.com/new](https://vercel.com/new) → Import from GitHub → Select repo → Deploy.

### Environment variables in Vercel

In **Settings → Environment Variables**, add the same keys from `.env.example`:

```
NEXT_PUBLIC_MRSS_URL          (your live channel manifest URL)
NEXT_PUBLIC_SUPABASE_URL      (from Supabase Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY (from Supabase Settings → API)
SUPABASE_SERVICE_ROLE_KEY     (server-side only — never NEXT_PUBLIC_)
NEXT_PUBLIC_MAPBOX_TOKEN      (from account.mapbox.com)
```

### Connect your custom domain

In Vercel **Settings → Domains**, add `myhumidor.app`. If you bought the domain at Cloudflare, Vercel will give you nameserver instructions — or use Cloudflare DNS with a `CNAME` to `cname.vercel-dns.com`.

SSL is automatic. Edge caching is automatic. Preview deployments per PR are automatic.

## Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste the contents of `supabase/schema.sql` → run.
3. **Settings → API** → copy the URL and anon key to your `.env.local` and Vercel env vars.
4. **Authentication → Providers** — enable Email (magic link is best UX for this audience) and optionally Google + Apple.

### Storage buckets

Create three buckets:
- `cigar-photos` (public read) — community-submitted images of cigars
- `lounge-photos` (public read) — verified storefronts
- `avatars` (public read) — user profile pictures

In **Storage → Policies**, allow authenticated users to upload to their own folder:

```sql
create policy "users upload own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

## Video delivery

Your existing CloudFront distribution (`d3h1d86sioogzh.cloudfront.net`) handles the heavy lifting. Two things to plan for as you scale:

**Switch to HLS for mobile**. Your MP4s work everywhere but eat bandwidth on cellular. Run a one-time pass with AWS Elemental MediaConvert (or [Mux](https://mux.com) if you want zero-ops video — ~$1/hr of source video, with smart adaptive streaming built in) to produce `.m3u8` playlists with multiple bitrates. The `VideoPlayer.tsx` component already detects `.m3u8` URLs and loads hls.js dynamically.

**Add signed URLs** when you launch the lounge program. CloudFront supports cookie or query-string signing — without it, anyone could embed your videos on their own site.

## Costs at scale

Rough math at 10k monthly active users:

- Vercel Pro: $20/mo + ~$40 in bandwidth overages = ~$60
- Supabase Pro: $25/mo + maybe $10 in compute add-ons = ~$35
- Mapbox: 200k loads × $0.50/1k = $75 (negotiate volume discount)
- CloudFront: 2 TB egress × $0.085/GB ≈ $170
- Domain: $1/mo

**Total at 10k MAU: ~$340/month.** That's the inflection point where you start having real revenue conversations.

## What to do next

1. Buy the domains
2. Spin up Vercel + Supabase projects
3. Run `supabase/schema.sql` against your DB
4. Set env vars and deploy
5. Seed the cigar catalog (manually for now — see `ROADMAP.md`)
6. Soft-launch to CigarTV's existing audience for ratings
