import Link from 'next/link';
import { CigarName } from '@/components/CigarName';
import { ArrowRight, MapPin, Tv, Flame, BadgeCheck, Award } from 'lucide-react';
import { getCigars, getStores } from '@/lib/catalog'; // <-- Updated Async Imports
import { boostedLounges } from '@/lib/featured-server';
import { applyOverrides } from '@/lib/overrides';
import { AddToCollection } from '@/components/AddToCollection';
import { BrandTile } from '@/components/BrandTile';
import { CigarThumb } from '@/components/CigarThumb';
import { RecentlyAdded } from '@/components/RecentlyAdded';
import { FeaturedBrands } from '@/components/FeaturedBrands';
import { AutoScrollRow } from '@/components/AutoScrollRow';
import { AficionadoSection } from '@/components/AficionadoSection';
import { NativeHome } from '@/components/NativeHome';

export const revalidate = 3600;

// Helper to rotate daily picks
function daySeed(): number {
  return Math.floor(Date.now() / (3 * 3600_000));
}

// Helper to create URL-safe brand slugs
function buildBrandSlug(brand: string): string {
  return (brand || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export default async function HomePage() {
  // 1. Fetch data asynchronously from your Supabase client
  const cigars = await getCigars();
  const stores = await getStores(); 

  const catalogCount = cigars.length;
  const loungeCount = Math.floor(stores.length / 10) * 10;

  // 2. Rebuild the 'featuredCigars' logic locally
  const withImg = cigars.filter((c) => c.image_url);
  const byBrand = new Map();
  for (const c of withImg) {
    if (!byBrand.has(c.brand)) byBrand.set(c.brand, c);
  }
  const brandCigars = Array.from(byBrand.values());
  const fOffset = daySeed() % Math.max(1, brandCigars.length);
  const fStep = Math.max(1, Math.floor(brandCigars.length / 30));
  const rawFeatured = [];
  for (let i = 0; i < brandCigars.length && rawFeatured.length < 30; i += fStep) {
    if (brandCigars.length > 0) rawFeatured.push(brandCigars[(i + fOffset) % brandCigars.length]);
  }

  const allFeatured = await applyOverrides(rawFeatured);
  const featured = allFeatured.slice(0, 12);
  const browse = allFeatured.slice(12, 17);

  // 3. Rebuild the 'featuredBrands' logic locally
  const counts = new Map();
  for (const c of cigars) {
    const e = counts.get(c.brand) ?? { count: 0, image: undefined };
    e.count++;
    if (!e.image && c.image_url) e.image = c.image_url;
    counts.set(c.brand, e);
  }
  const validBrands = Array.from(counts.entries()).filter(([, e]) => e.count >= 3);
  const bOffset = daySeed() % Math.max(1, validBrands.length);
  const bStep = Math.max(1, Math.floor(validBrands.length / 14));
  const brands = [];
  for (let i = 0; i < validBrands.length && brands.length < 14; i += bStep) {
    if (!validBrands.length) break;
    const [brandName, e] = validBrands[(i + bOffset) % validBrands.length];
    brands.push({ brand: brandName as string, slug: buildBrandSlug(brandName as string), count: e.count, image_url: e.image });
  }

  // 4. Rebuild the 'featuredLounges' logic locally
  const usableStores = stores.filter((s) => s.lat && s.lng);
  const pool = usableStores.length >= 8 ? usableStores : stores;
  const sOffset = daySeed() % Math.max(1, pool.length);
  const sStep = Math.max(1, Math.floor(pool.length / 8));
  const baseLounges = [];
  for (let i = 0; i < pool.length && baseLounges.length < 8; i += sStep) {
    if (pool.length > 0) baseLounges.push(pool[(i + sOffset) % pool.length]);
  }

  const boosted = await boostedLounges(4);
  const seen = new Set(boosted.map((l) => l.slug));
  const lounges = [...boosted, ...baseLounges.filter((l) => !seen.has(l.slug))].slice(0, 8);

  const nativeFeatured = featured.slice(0, 10).map((c) => ({ slug: c.slug, brand: c.brand, name: c.name, image_url: c.image_url ?? null }));

  return (
    <>
      <NativeHome featured={nativeFeatured} />
      <div className="web-home mx-auto max-w-7xl px-6 pt-8">
        {/* ─── HERO ──────────────────────────────────────────────────────────── */}
        <section className="relative py-12 lg:py-16 animate-fade-up">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-40 -top-24 h-[480px] w-[640px] rounded-full opacity-50 blur-3xl"
            style={{ background: 'radial-gradient(closest-side, rgba(240,195,85,0.14), rgba(58,36,23,0.10), transparent 70%)' }}
          />
          <div className="eyebrow mb-3">Premium cigars, tracked.</div>
          <h1 className="font-display text-5xl leading-[0.95] tracking-tightest sm:text-6xl lg:text-7xl">
            <span className="italic text-ember-400">Rate</span> what you smoke.
            <br />
            <span className="text-smoke-200">Collect</span> what you love.
            <br />
            <span className="text-smoke-400">Discover</span> Something New
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-smoke-200">
            MyHumidor by CigarTV is your personal humidor and a community of cigar smokers. Track the
            top cigars in the country, see what&apos;s featured on CigarTV this week, and find every
            cigar in stock at lounges near you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/top" className="btn-primary">
              Top Cigars Right Now <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
            <Link href="/humidor" className="btn-ghost">
              Open Your Humidor
            </Link>
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-xl border-[0.5px] border-ember-400/15 bg-ember-400/10">
            {[
              { v: `${Math.floor(catalogCount / 1000)}k+`, l: 'Cigars tracked' },
              { v: `${loungeCount}+`, l: 'Lounges & Shops' },
            ].map((st) => (
              <div key={st.l} className="bg-char/80 px-4 py-3 text-center">
                <dt className="sr-only">{st.l}</dt>
                <dd className="font-display text-xl tabular text-ember-100 sm:text-2xl">{st.v}</dd>
                <dd className="mt-0.5 text-[10px] uppercase tracking-wider text-smoke-400">{st.l}</dd>
              </div>
            ))}
            <a
              href="https://cigartv.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center justify-center bg-char/80 px-4 py-2.5 text-center transition hover:bg-char"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cigartv-logo.png" alt="CigarTV" className="h-9 w-9 object-contain" />
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-ember-100 group-hover:text-ember-400">Watch Now</span>
            </a>
          </dl>
        </section>

        <Rule />

        {/* ─── FEATURED CIGARS CAROUSEL ─────────────────────────────────── */}
        <section className="py-10">
          <SectionHeader
            title="Featured Cigars"
            subtitle="Handpicked this week"
            href="/top"
            icon={<Flame size={14} strokeWidth={1.5} className="text-ember-400" />}
          />
          <AutoScrollRow className="-mx-6 px-6 pb-3">
            {featured.map((c) => (
              <Link
                key={c.uuid}
                href={`/cigars/${c.slug}`}
                className="group w-44 shrink-0 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="relative">
                  <CigarThumb
                    slug={c.slug}
                    brand={c.brand}
                    src={c.image_url}
                    fit="contain"
                    rounded="rounded-xl"
                    className="aspect-[4/5] w-full text-4xl transition group-hover:ring-1 group-hover:ring-ember-400/50"
                  />
                  {c.price != null && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-char/90 px-1.5 py-0.5 font-display text-xs tabular text-ember-100 ring-1 ring-ember-400/20">
                      ${c.price}
                    </span>
                  )}
                </div>
                <div className="mt-2 truncate text-sm font-medium group-hover:text-ember-100"><CigarName slug={c.slug} name={c.name} /></div>
                <div className="truncate text-xs text-smoke-400">{c.brand} · {c.size}</div>
              </Link>
            ))}
          </AutoScrollRow>
        </section>

        <Rule />

        {/* ─── FEATURED BRANDS ──────────────────────────────────────────── */}
        <section className="py-10">
          <SectionHeader
            title="Featured Brands"
            subtitle="Try Something New"
            href="/search"
            icon={<Award size={14} strokeWidth={1.5} className="text-ember-400" />}
          />
          <FeaturedBrands brands={brands} />
        </section>

        <Rule />

        {/* ─── FEATURED LOUNGES CAROUSEL ────────────────────────────────── */}
        <section className="py-10">
          <SectionHeader
            title="Featured Lounges & Shops"
            subtitle="Lounges and shops across the country"
            href="/lounges"
            icon={<MapPin size={14} strokeWidth={1.5} className="text-ember-400" />}
          />
          <AutoScrollRow className="-mx-6 px-6 pb-3">
            {lounges.map((l) => (
              <Link
                key={l.id}
                href={`/lounges/${l.slug}`}
                className="group relative w-64 shrink-0 overflow-hidden rounded-xl border-[0.5px] border-ember-400/15 bg-gradient-to-b from-char/70 to-char/30 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-ember-400/45 hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
              >
                <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-ember-400/0 to-transparent transition-all duration-300 group-hover:via-ember-400/80" />
                <div className="flex items-center gap-3">
                  <BrandTile name={l.name} className="h-14 w-14 shrink-0 text-lg ring-1 ring-ember-400/15" rounded="rounded-xl" />
                  <div className="min-w-0">
                    <span className="block truncate font-display text-base font-medium group-hover:text-ember-100">
                      {l.name}
                    </span>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-smoke-400">
                      {[l.city, l.state].filter(Boolean).join(', ')}
                    </div>
                    {l.verified && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-ember-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ember-100 ring-1 ring-ember-400/25">
                        <BadgeCheck size={10} strokeWidth={2} /> Verified
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </AutoScrollRow>
        </section>

        <Rule />

        <AficionadoSection />

        <Rule />

        {/* ─── BROWSE CIGARS PREVIEW ───────────────────────────────────────── */}
        <section className="py-12">
          <SectionHeader
            title="Browse cigars"
            subtitle="From the catalog"
            href="/top"
            icon={<Flame size={14} strokeWidth={1.5} className="text-ember-400" />}
          />
          <div className="overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
            {browse.map((c) => (
              <div
                key={c.uuid}
                className="flex items-center gap-4 border-b-[0.5px] border-ember-400/10 bg-char/40 px-4 py-3.5 last:border-b-0 sm:px-5"
              >
                <CigarThumb slug={c.slug} brand={c.brand} src={c.image_url} fit="contain" className="h-10 w-8 shrink-0 text-[10px]" rounded="rounded" />
                <Link href={`/cigars/${c.slug}`} className="group min-w-0 flex-1">
                  <div className="truncate font-display text-base font-medium text-paper group-hover:text-ember-100">
                    {c.brand} {c.name}
                    <span className="text-smoke-400"> · {c.size}</span>
                  </div>
                  {c.country && <div className="mt-0.5 truncate text-xs text-smoke-400">{c.country}</div>}
                </Link>
                <AddToCollection seed={{ cigarId: c.uuid, slug: c.slug, brand: c.brand, name: c.name, size: c.size }} />
              </div>
            ))}
          </div>
        </section>

        <Rule />

        {/* ─── RECENTLY ADDED ──────────────────────────────────────────────── */}
        <section className="py-12">
          <RecentlyAdded cigars />
        </section>

        <Rule />
      </div>
    </>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  icon,
}: {
  title: string;
  subtitle: string;
  href?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <div className="eyebrow flex items-center gap-2">
          {icon}
          {subtitle}
        </div>
        <h2 className="font-display text-3xl tracking-tightest mt-1">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-xs uppercase tracking-widest text-ember-100 hover:text-ember-400">
          View all <ArrowRight size={12} strokeWidth={1.5} className="inline" />
        </Link>
      )}
    </div>
  );
}

function Rule() {
  return <div className="band-rule h-px w-full" />;
}