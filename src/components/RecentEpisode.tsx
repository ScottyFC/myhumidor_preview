import Link from 'next/link';
import { Star, Play, Clock } from 'lucide-react';
import type { Episode, Cigar } from '@/types';
import { formatRelativeDate } from '@/lib/utils';

interface Props {
  episode: Episode;
  cigar: Cigar | null;
}

function runtime(sec: number): string {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

/**
 * A recently-aired CigarTV episode pulled from the MRSS feed. The thumbnail is
 * a play button that opens the episode's stream (media:content videoUrl); the
 * featured cigar, when tagged, links into the catalog below.
 */
export function RecentEpisode({ episode, cigar }: Props) {
  return (
    <div className="group/ep flex flex-col overflow-hidden rounded-xl border-[0.5px] border-ember-400/15 bg-char/50 transition hover:border-ember-400/35">
      {/* Watch thumbnail */}
      <a
        href={episode.videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video w-full overflow-hidden bg-leather-deep"
        title={`Watch ${episode.title}`}
      >
        {episode.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={episode.thumbnailUrl}
            alt={episode.title}
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition duration-300 group-hover/ep:scale-[1.03] group-hover/ep:opacity-100"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-leather to-char" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-char/80 via-transparent to-transparent" />
        {/* Play button */}
        <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ember-400/90 text-paper shadow-[0_6px_20px_rgba(0,0,0,0.5)] transition group-hover/ep:scale-110">
          <Play size={20} strokeWidth={1.5} className="ml-0.5 fill-paper" />
        </span>
        {episode.durationSec > 0 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-char/85 px-1.5 py-0.5 text-[10px] tabular text-smoke-100">
            <Clock size={9} strokeWidth={1.5} /> {runtime(episode.durationSec)}
          </span>
        )}
      </a>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between">
          <div className="eyebrow truncate">{episode.seriesTitle}</div>
          <div className="shrink-0 text-[11px] text-smoke-400">{formatRelativeDate(episode.pubDateISO)}</div>
        </div>
        <h3 className="mt-1.5 line-clamp-2 font-display text-base font-medium leading-tight text-paper">
          {episode.title}
        </h3>

        <div className="mt-auto pt-3">
          {cigar ? (
            <Link
              href={`/cigars/${cigar.slug}`}
              className="group/c flex items-center gap-2 text-xs text-smoke-300 hover:text-ember-100"
            >
              <Star size={11} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
              <span className="truncate">Featured: {cigar.brand} {cigar.line}</span>
            </Link>
          ) : (
            <a
              href={episode.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ember-100 hover:text-ember-300"
            >
              <Play size={12} strokeWidth={1.5} /> Watch on CigarTV
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
