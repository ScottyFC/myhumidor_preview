import Link from 'next/link';
import { ArrowRight, MapPin, Star, Tv } from 'lucide-react';
import { fetchEpisodes } from '@/lib/mrss';
import { MOCK_CIGARS, MOCK_LOUNGES } from '@/lib/mock-data';
import { EpisodeCard } from '@/components/EpisodeCard';

export const revalidate = 3600;

export default async function HomePage() {
  const episodes = await fetchEpisodes();
  const recent = episodes
    .sort((a, b) => b.pubDateISO.localeCompare(a.pubDateISO))
    .slice(0, 4);
  const hero = recent[0];
  const topCigars = [...MOCK_CIGARS]
    .sort((a, b) => b.overallAvg - a.overallAvg)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-8">
      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="grid gap-10 py-10 lg:grid-cols-12 lg:py-16">
        <div className="lg:col-span-7 animate-fade-up">
          <div className="eyebrow mb-3">Issue No. {String(episodes.length).padStart(3, '0')} · Tampa</div>
          <h1 className="font-display text-5xl leading-[0.95] tracking-tightest sm:text-6xl lg:text-7xl">
            <span className="italic text-ember-400">Rate</span> what you smoke.
            <br />
            <span className="text-smoke-200">Collect</span> what you love.
            <br />
            <span className="text-smoke-400">Discover</span> what's next.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-smoke-200">
            MyHumidor by CigarTV is a personal humidor, a community of cigar smokers, and the full
            CigarTV catalog — together. Every episode surfaces the cigars featured, where to find
            them, and what your fellow members think.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/watch" className="btn-primary">
              Watch CigarTV <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
            <Link href="/humidor" className="btn-ghost">
              Open your humidor
            </Link>
          </div>
        </div>

        {hero && (
          <div className="lg:col-span-5">
            <Link
              href={`/watch/${hero.guid}`}
              className="group block overflow-hidden rounded-xl border-[0.5px] border-ember-400/20"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-leather-dark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.thumbnailUrl}
                  alt={hero.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-char via-char/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <div className="eyebrow mb-2">Latest · {hero.seriesTitle}</div>
                  <div className="font-display text-2xl font-medium leading-tight text-paper">
                    {hero.title}
                  </div>
                  <div className="mt-2 text-xs text-smoke-200 line-clamp-2">{hero.description}</div>
                </div>
              </div>
            </Link>
          </div>
        )}
      </section>

      <Rule />

      {/* ─── RECENT EPISODES ──────────────────────────────────────────────── */}
      <section className="py-12">
        <SectionHeader title="From the catalog" subtitle="Latest from CigarTV" href="/watch" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((ep) => (
            <EpisodeCard key={ep.guid} episode={ep} />
          ))}
        </div>
      </section>

      <Rule />

      {/* ─── TOP CIGARS ──────────────────────────────────────────────────── */}
      <section className="py-12">
        <SectionHeader title="Most beloved" subtitle="Top rated across the community" href="/humidor" />
        <div className="grid gap-4 sm:grid-cols-3">
          {topCigars.map((c, i) => (
            <Link
              key={c.id}
              href={`/cigars/${c.slug}`}
              className="group rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-5 transition hover:border-ember-400/35"
            >
              <div className="font-display text-5xl italic text-ember-400/60 tabular">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="eyebrow mt-3">{c.brand}</div>
              <div className="font-display text-lg font-medium leading-tight">
                {c.line} <span className="text-smoke-400">· {c.vitola}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Star size={13} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                <span className="tabular font-medium">{c.overallAvg.toFixed(1)}</span>
                <span className="text-smoke-400">· {c.ratingCount.toLocaleString()} ratings</span>
              </div>
            </Link>
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
            A free TV stick. Measurable foot traffic. The verified check on every map your customers
            use. No upfront cost.
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

function SectionHeader({ title, subtitle, href }: { title: string; subtitle: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <div className="eyebrow">{subtitle}</div>
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
