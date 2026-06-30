import Link from 'next/link';
import { CigarName } from '@/components/CigarName';
import { ArrowRight, MapPin, Tv, Flame, BadgeCheck, Award } from 'lucide-react';
import { featuredCigars, featuredLounges, featuredBrands, allCigars, allStores } from '@/lib/catalog';
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

export default async function HomePage() {
  const catalogCount = allCigars().length;
  const loungeCount = Math.floor(allStores().length / 10) * 10;
  const allFeatured = await applyOverrides(featuredCigars(30));
  const featured = allFeatured.slice(0, 12);
  const browse = allFeatured.slice(12, 17);
  const boosted = await boostedLounges(4);
  const baseLounges = featuredLounges(8);
  const brands = featuredBrands(14);
  // Credit-boosted lounges lead the carousel; fill the rest with the daily picks.
  const seen = new Set(boosted.map((l) => l.slug));
  const lounges = [...boosted, ...baseLounges.filter((l) => !seen.has(l.slug))].slice(0, 8);

  const nativeFeatured = featured.slice(0, 10).map((c) => ({ slug: c.slug, brand: c.brand, name: c.name, image_url: c.image_url ?? null }));
  return (
    <>
      <NativeHome featured={nativeFeatured} />
    <div className="web-home mx-auto max-w-7xl px-6 pt-8">
      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative py-12 lg:py-16 animate-fade-up">
        {/* Ambient ember glow — pure CSS, sits behind the headline */}
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

        {/* Live catalog stats — real numbers, computed at build/request time */}
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
              {/* ember accent line that wakes on hover */}
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

      {/* ─── LOUNGE PROGRAM PITCH ──────────────────────────────────────── */}
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
