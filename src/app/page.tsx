import Link from 'next/link';
import { ArrowRight, MapPin, Tv, Flame, Star, BadgeCheck } from 'lucide-react';
import { fetchEpisodes, recentEpisodes } from '@/lib/mrss';
import { getTopCigars, getTopLounges, findFeaturedForEpisode, MOCK_LOUNGES } from '@/lib/mock-data';
import { featuredCigars } from '@/lib/catalog';
import { RecentEpisode } from '@/components/RecentEpisode';
import { AddToCollection } from '@/components/AddToCollection';
import { BrandTile } from '@/components/BrandTile';

export const revalidate = 3600;

export default async function HomePage() {
  const episodes = await fetchEpisodes();
  const recent = recentEpisodes(episodes, 6);
  const topCigars = getTopCigars(5);
  const featured = featuredCigars(12);
  const featuredLounges = getTopLounges().slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-8">
      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="py-12 lg:py-16 animate-fade-up">
        <div className="eyebrow mb-3">Premium cigar, tracked</div>
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
          title="Featured cigars"
          subtitle="Handpicked this week"
          href="/top"
          icon={<Flame size={14} strokeWidth={1.5} className="text-ember-400" />}
        />
        <div className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-3 [scrollbar-width:thin]">
          {featured.map((c) => (
            <Link
              key={c.uuid}
              href={`/cigars/${c.slug}`}
              className="group w-44 shrink-0 snap-start"
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
        </div>
      </section>

      <Rule />

      {/* ─── FEATURED LOUNGES CAROUSEL ────────────────────────────────── */}
      <section className="py-10">
        <SectionHeader
          title="Featured lounges"
          subtitle="Top-rated near the community"
          href="/lounges"
          icon={<MapPin size={14} strokeWidth={1.5} className="text-ember-400" />}
        />
        <div className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-3 [scrollbar-width:thin]">
          {featuredLounges.map((l) => (
            <Link
              key={l.id}
              href={`/lounges/${l.slug}`}
              className="group w-60 shrink-0 snap-start rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4 transition hover:border-ember-400/40"
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
                  <div className="text-xs text-smoke-400">{l.city}, {l.state}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-ember-100">
                <Star size={12} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                <span className="tabular">{l.rating.toFixed(1)}</span>
                <span className="tabular text-smoke-400">({l.reviewCount.toLocaleString()})</span>
              </div>
              {l.stocked.length > 0 && (
                <div className="mt-2 truncate text-xs text-smoke-400">
                  Stocks {l.stocked.slice(0, 2).map((s) => s.brand).join(', ')}…
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      <Rule />

      {/* ─── THIS WEEK ON CIGARTV ─────────────────────────────────────────── */}
      <section className="py-12">
        <SectionHeader
          title="This week on CigarTV"
          subtitle="Recent episodes & their featured cigars"
          icon={<Tv size={14} strokeWidth={1.5} className="text-ember-400" />}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((ep) => (
            <RecentEpisode
              key={ep.guid}
              episode={ep}
              cigar={findFeaturedForEpisode(ep.guid)?.cigar ?? null}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-smoke-400">
          Episodes air on CigarTV. We surface the cigar featured in each and link you straight to
          its profile.
        </p>
      </section>

      <Rule />

      {/* ─── TOP CIGARS PREVIEW ──────────────────────────────────────────── */}
      <section className="py-12">
        <SectionHeader
          title="Top cigars in the US"
          subtitle="Ranked by the community this week"
          href="/top"
          icon={<Flame size={14} strokeWidth={1.5} className="text-ember-400" />}
        />
        <div className="overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
          {topCigars.map(({ rank, cigar }) => (
            <div
              key={cigar.id}
              className="flex items-center gap-4 border-b-[0.5px] border-ember-400/10 bg-char/40 px-4 py-3.5 last:border-b-0 sm:px-5"
            >
              <span className="w-7 shrink-0 text-center font-display text-xl italic tabular text-ember-400/70">
                {rank}
              </span>
              <Link href={`/cigars/${cigar.slug}`} className="group min-w-0 flex-1">
                <div className="truncate font-display text-base font-medium text-paper group-hover:text-ember-100">
                  {cigar.brand} {cigar.line}
                  <span className="text-smoke-400"> · {cigar.vitola}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-smoke-400">{cigar.wrapper}</div>
              </Link>
              <AddToCollection seed={{ cigarId: cigar.id, slug: cigar.slug, brand: cigar.brand, name: cigar.line, size: cigar.vitola }} />
            </div>
          ))}
        </div>
      </section>

      <Rule />

      {/* ─── LOUNGE PROGRAM PITCH ──────────────────────────────────────── */}
      <section className="grid gap-8 py-16 lg:grid-cols-2">
        <div>
          <div className="eyebrow mb-3 flex items-center gap-2">
            <Tv size={14} strokeWidth={1.5} className="text-ember-400" />
            For lounges &amp; shops
          </div>
          <h2 className="font-display text-4xl leading-tight tracking-tightest">
            Become a <span className="italic text-ember-400">verified</span> CigarTV partner.
          </h2>
          <p className="mt-4 text-smoke-200">
            A free TV stick streaming the live CigarTV channel. Measurable foot traffic. The verified
            check on every map your customers use. No upfront cost.
          </p>
          <Link href="/lounges/join" className="btn-primary mt-6">
            The Lounge Program <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {MOCK_LOUNGES.filter((l) => l.verified).slice(0, 3).map((l) => (
            <Link
              key={l.id}
              href={`/lounges/${l.slug}`}
              className="group rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4 transition hover:border-ember-400/40"
            >
              <div className="flex items-center gap-1.5">
                <MapPin size={11} strokeWidth={1.5} className="text-ember-400" />
                <span className="eyebrow">verified</span>
              </div>
              <div className="font-display mt-1 text-base font-medium group-hover:text-ember-100">{l.name}</div>
              <div className="mt-1 text-xs text-smoke-400">{l.city}, {l.state}</div>
              <div className="mt-2 text-xs text-smoke-200 tabular">
                {l.inventoryCount} cigars in stock
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-ember-100">
                View profile <ArrowRight size={11} strokeWidth={1.5} />
              </div>
            </Link>
          ))}
        </div>
      </section>
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
