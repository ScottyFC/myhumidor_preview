import Link from 'next/link';
import { ArrowRight, MapPin, Star, Tv, Flame } from 'lucide-react';
import { fetchEpisodes, recentEpisodes } from '@/lib/mrss';
import { getTopCigars, findFeaturedForEpisode, MOCK_LOUNGES } from '@/lib/mock-data';
import { RecentEpisode } from '@/components/RecentEpisode';
import { AddToHumidorButton } from '@/components/AddToHumidorButton';

export const revalidate = 3600;

export default async function HomePage() {
  const episodes = await fetchEpisodes();
  const recent = recentEpisodes(episodes, 6);
  const topCigars = getTopCigars(5);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-8">
      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="py-12 lg:py-16 animate-fade-up">
        <div className="eyebrow mb-3">Tampa · Premium cigar, tracked</div>
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
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-smoke-400">
                  <Star size={11} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                  <span className="tabular text-ember-100">{cigar.overallAvg.toFixed(1)}</span>
                  <span className="tabular">· {cigar.ratingCount.toLocaleString()}</span>
                </div>
              </Link>
              <AddToHumidorButton cigarId={cigar.id} size="sm" className="shrink-0" />
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
          <Link href="/lounges" className="btn-primary mt-6">
            The Lounge Program <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {MOCK_LOUNGES.filter((l) => l.verified).slice(0, 3).map((l) => (
            <div key={l.id} className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4">
              <div className="flex items-center gap-1.5">
                <MapPin size={11} strokeWidth={1.5} className="text-ember-400" />
                <span className="eyebrow">verified</span>
              </div>
              <div className="font-display mt-1 text-base font-medium">{l.name}</div>
              <div className="mt-1 text-xs text-smoke-400">{l.city}, {l.state}</div>
              <div className="mt-2 text-xs text-smoke-200 tabular">
                {l.inventoryCount} cigars in stock
              </div>
            </div>
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
