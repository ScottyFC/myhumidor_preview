import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Tv } from 'lucide-react';
import { fetchEpisodes, findEpisodeByGuid, formatDuration } from '@/lib/mrss';
import { findFeaturedForEpisode } from '@/lib/mock-data';
import { VideoPlayer } from '@/components/VideoPlayer';
import { EpisodeCard } from '@/components/EpisodeCard';
import { formatRelativeDate } from '@/lib/utils';

export const revalidate = 3600;

export async function generateStaticParams() {
  // Pre-render the first 50 episodes for snappy initial loads.
  const episodes = await fetchEpisodes();
  return episodes.slice(0, 50).map((e) => ({ guid: e.guid }));
}

interface PageProps {
  params: Promise<{ guid: string }>;
}

export default async function EpisodePage({ params }: PageProps) {
  const { guid } = await params;
  const episodes = await fetchEpisodes();
  const episode = findEpisodeByGuid(episodes, guid);
  if (!episode) notFound();

  const featured = findFeaturedForEpisode(guid);
  const related = episodes
    .filter((e) => e.series === episode.series && e.guid !== episode.guid)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-6 pt-6">
      <Link
        href="/watch"
        className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-smoke-400 hover:text-paper"
      >
        <ArrowLeft size={12} strokeWidth={1.5} /> Watch catalog
      </Link>

      <VideoPlayer episode={episode} featured={featured} />

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="eyebrow mb-2">
            <Tv size={11} className="mr-1 inline" strokeWidth={1.5} />
            {episode.seriesTitle} · S{episode.seasonNum} E{episode.episodeNum}
          </div>
          <h1 className="font-display text-4xl leading-tight tracking-tightest">{episode.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-smoke-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={11} strokeWidth={1.5} /> {formatRelativeDate(episode.pubDateISO)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={11} strokeWidth={1.5} /> {formatDuration(episode.durationSec)}
            </span>
            <span className="rounded border-[0.5px] border-smoke-400/40 px-1.5 py-0.5 tabular text-[10px]">
              {episode.rating}
            </span>
          </div>

          <div className="mt-6 font-display text-lg leading-relaxed text-smoke-100">
            {episode.description}
          </div>

          {episode.keywords.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {episode.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full border-[0.5px] border-ember-400/15 px-2.5 py-0.5 text-[11px] text-smoke-200"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Featured cigar sidebar (duplicates overlay but persistent) */}
        {featured && (
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 p-5">
              <div className="eyebrow mb-2">Featured in this episode</div>
              <Link
                href={`/cigars/${featured.cigar.slug}`}
                className="font-display text-xl font-medium leading-tight text-paper hover:text-ember-100"
              >
                {featured.cigar.brand}
                <div className="text-smoke-200 italic">{featured.cigar.line}</div>
              </Link>
              <div className="mt-2 text-xs text-smoke-400">
                {featured.cigar.vitola} · {featured.cigar.wrapper}
              </div>
              <div className="mt-4 border-t border-ember-400/10 pt-4">
                <div className="eyebrow mb-2">Nearby in stock</div>
                <div className="space-y-2">
                  {featured.nearby.map((l) => (
                    <div key={l.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{l.name}</span>
                      <span className="tabular text-xs text-ember-100">
                        {l.distanceMi?.toFixed(1)} mi
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href={`/cigars/${featured.cigar.slug}`} className="btn-primary mt-5 w-full justify-center">
                View this cigar
              </Link>
            </div>
          </aside>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-ember-400/15 pt-12">
          <div className="eyebrow mb-2">More from</div>
          <h2 className="font-display text-3xl tracking-tightest mb-6">{episode.seriesTitle}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((ep) => (
              <EpisodeCard key={ep.guid} episode={ep} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
