import Link from 'next/link';
import { ArrowRight, MapPin, Tv, Flame, BadgeCheck } from 'lucide-react';
import { fetchEpisodes, recentEpisodes } from '@/lib/mrss';
import { featuredCigars, featuredLounges } from '@/lib/catalog';
import { boostedLounges } from '@/lib/featured-server';
import { RecentEpisode } from '@/components/RecentEpisode';
import { AddToCollection } from '@/components/AddToCollection';
import { BrandTile } from '@/components/BrandTile';
import { RecentlyAdded } from '@/components/RecentlyAdded';
import { AutoScrollRow } from '@/components/AutoScrollRow';
import { AficionadoSection } from '@/components/AficionadoSection';

export const revalidate = 3600;

export default async function HomePage() {
  const episodes = await fetchEpisodes();
  const recent = recentEpisodes(episodes, 6);
  const allFeatured = featuredCigars(24);
  const featured = allFeatured.slice(0, 12);
  const browse = allFeatured.slice(12, 17);
  const boosted = await boostedLounges(4);
  const baseLounges = featuredLounges(8);
  // Credit-boosted lounges lead the carousel; fill the rest with the daily picks.
  const seen = new Set(boosted.map((l) => l.slug));
  const lounges = [...boosted, ...baseLounges.filter((l) => !seen.has(l.slug))].slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-8">
      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="py-12 lg:py-16 animate-fade-up">
        <div className="eyebrow mb-3">Premium cigars, tracked.</div>
        <h1 className="font-display text-5xl leading-[0.95] tracking-tightest sm:text-6xl lg:text-7xl">
          <span className="italic text-ember-400">Rate</span> what you smoke.
          <br />
          <span className="text-smoke-200">Collect</span> what you love.
          <br />
          <span className="text-smoke-400">Discover</span> what&apos;s next.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-smoke-200">
          MyHumidor by CigarTV is your personal humidor and a community of cigar smokers. Track the
          top cigars in the country, see what&apos;s featured on CigarTV this week, and find every
          cigar in stock at lounges near you.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/top" className="btn-primary">
            Top cigars right now <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
          <Link href="/humidor" className="btn-ghost">
            Open your humidor
          </Link>
        </div>
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
              className="group w-44 shrink-0"
            >
              <BrandTile
                name={c.brand}
                src={c.image_url}
                fit="contain"
                rounded="rounded-xl"
                className="aspect-[4/5] w-full text-4xl transition group-hover:ring-1 group-hover:ring-ember-400/40"
              />
              <div className="mt-2 truncate text-sm font-medium group-hover:text-ember-100">{c.name}</div>
              <div className="truncate text-xs text-smoke-400">
                {c.brand} · {c.size}
                {c.price != null && <span className="text-smoke-200"> · {`$${c.price}`}</span>}
              </div>
            </Link>
          ))}
        </AutoScrollRow>
      </section>

      <Rule />

      {/* ─── FEATURED LOUNGES CAROUSEL ────────────────────────────────── */}
      <section className="py-10">
        <SectionHeader
          title="Featured Lounges"
          subtitle="Lounges and shops across the country"
          href="/lounges"
          icon={<MapPin size={14} strokeWidth={1.5} className="text-ember-400" />}
        />
        <AutoScrollRow className="-mx-6 px-6 pb-3">
          {lounges.map((l) => (
            <Link
              key={l.id}
              href={`/lounges/${l.slug}`}
              className="group w-60 shrink-0 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4 transition hover:border-ember-400/40"
            >
              <div className="flex items-center gap-3">
                <BrandTile name={l.name} className="h-12 w-12 shrink-0 text-lg" rounded="rounded-lg" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-display text-base font-medium group-hover:text-ember-100">
                      {l.name}
                    </span>
                    {l.verified && <BadgeCheck size={13} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
                  </div>
                  <div className="text-xs text-smoke-400">{[l.city, l.state].filter(Boolean).join(', ')}</div>
                </div>
              </div>
            </Link>
          ))}
        </AutoScrollRow>
      </section>

      <Rule />

      <AficionadoSection />

      <Rule />

      {/* ─── THIS WEEK ON CIGARTV ─────────────────────────────────────────── */}
      <section className="py-12">
        <SectionHeader
          title="This week on CigarTV"
          subtitle="Latest episodes from the channel"
          icon={<Tv size={14} strokeWidth={1.5} className="text-ember-400" />}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((ep) => (
            <RecentEpisode key={ep.guid} episode={ep} cigar={null} />
          ))}
        </div>
      </section>

      <Rule />

      {/* ─── BROWSE CIGARS PREVIEW ───────────────────────────────────────── */}
      <section className="py-12">
        <SectionHeader
          title="Browse cigars"
          subtitle="From the 23,000-cigar catalog"
          href="/top"
          icon={<Flame size={14} strokeWidth={1.5} className="text-ember-400" />}
        />
        <div className="overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
          {browse.map((c) => (
            <div
              key={c.uuid}
              className="flex items-center gap-4 border-b-[0.5px] border-ember-400/10 bg-char/40 px-4 py-3.5 last:border-b-0 sm:px-5"
            >
              <BrandTile name={c.brand} src={c.image_url} fit="contain" className="h-10 w-8 shrink-0 text-[10px]" rounded="rounded" />
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
        <RecentlyAdded cigars members />
      </section>

      <Rule />

      {/* ─── LOUNGE PROGRAM PITCH ──────────────────────────────────────── */}
    </div>
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
