import Link from 'next/link';
import { Star, ArrowRight } from 'lucide-react';
import type { Episode, Cigar } from '@/types';
import { formatRelativeDate } from '@/lib/utils';

interface Props {
  episode: Episode;
  cigar: Cigar | null;
}

/**
 * A reference to a recent CigarTV episode. The episode isn't playable on the
 * site — we surface what aired and link to the cigar featured in it.
 */
export function RecentEpisode({ episode, cigar }: Props) {
  return (
    <div className="flex flex-col rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-5">
      <div className="flex items-center justify-between">
        <div className="eyebrow truncate">{episode.seriesTitle}</div>
        <div className="text-[11px] text-smoke-400">{formatRelativeDate(episode.pubDateISO)}</div>
      </div>
      <h3 className="mt-2 font-display text-lg font-medium leading-tight text-paper line-clamp-2">
        {episode.title}
      </h3>

      {cigar ? (
        <Link
          href={`/cigars/${cigar.slug}`}
          className="group mt-4 flex items-center gap-3 rounded-md border-[0.5px] border-ember-400/15 bg-char/60 p-3 transition hover:border-ember-400/40"
        >
          {/* stylized cigar */}
          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-gradient-to-b from-leather to-leather-deep">
            <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-ember-600 border-y border-ember-400/40" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="eyebrow">Featured cigar</div>
            <div className="truncate text-sm font-medium text-paper group-hover:text-ember-100">
              {cigar.brand} {cigar.line}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-smoke-400">
              <Star size={11} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
              <span className="tabular">{cigar.overallAvg.toFixed(1)}</span>
              <span>· {cigar.vitola}</span>
            </div>
          </div>
          <ArrowRight
            size={15}
            strokeWidth={1.5}
            className="shrink-0 text-smoke-400 group-hover:text-ember-100"
          />
        </Link>
      ) : (
        <div className="mt-4 text-xs text-smoke-400">No cigar tagged for this episode yet.</div>
      )}
    </div>
  );
}
