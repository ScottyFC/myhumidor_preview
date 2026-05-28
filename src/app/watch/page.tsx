import { fetchEpisodes, groupBySeries } from '@/lib/mrss';
import { EpisodeCard } from '@/components/EpisodeCard';

export const revalidate = 3600;

export default async function WatchPage() {
  const episodes = await fetchEpisodes();
  const series = groupBySeries(episodes);

  return (
    <div className="mx-auto max-w-7xl px-6 pt-10">
      <header className="mb-10">
        <div className="eyebrow mb-2">The CigarTV catalog</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">Watch</h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          {episodes.length} episodes across {series.length} series. Subtitles available in English,
          Spanish, German, and Portuguese.
        </p>
      </header>

      <div className="space-y-16">
        {series.map((s) => (
          <section key={s.id} id={s.id.toLowerCase()}>
            <div className="mb-5 flex items-end justify-between">
              <div>
                <div className="eyebrow">{s.episodes.length} episodes</div>
                <h2 className="font-display text-3xl tracking-tightest mt-1">{s.title}</h2>
                <p className="mt-1 max-w-lg text-sm text-smoke-400 italic">{s.tagline}</p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {s.episodes.slice(0, 8).map((ep) => (
                <EpisodeCard key={ep.guid} episode={ep} />
              ))}
            </div>
            {s.episodes.length > 8 && (
              <div className="mt-4 text-xs uppercase tracking-widest text-smoke-400">
                + {s.episodes.length - 8} more
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
