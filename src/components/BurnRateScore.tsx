import { Tv } from 'lucide-react';
import { burnRateForSlug, hasAired, fmtAirDate, BURN_RATE_LOGO } from '@/lib/burnrate';

/** Burn Rate score on a cigar's profile page — shown only if the cigar was featured
 *  and the episode has aired with a score. */
export function BurnRateScore({ slug }: { slug: string }) {
  const ep = burnRateForSlug(slug);
  if (!ep || !hasAired(ep) || ep.score == null) return null;

  return (
    <a href={ep.episodeUrl} target="_blank" rel="noopener noreferrer"
      className="mt-4 flex items-center gap-3 rounded-xl border-[0.5px] border-ember-400/25 bg-gradient-to-r from-ember-400/12 to-transparent p-4 transition hover:border-ember-400/40">
      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-ember-400 font-display text-lg font-bold leading-none text-paper">
        {ep.score.toFixed(1)}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium text-paper">
          Burn Rate Score
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-smoke-400">
          <Tv size={11} className="text-ember-400" /> Featured on
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BURN_RATE_LOGO} alt="Burn Rate" className="h-3 w-auto dark:invert" /> · {fmtAirDate(ep.airDate)}
        </span>
      </span>
      <span className="ml-auto shrink-0 text-xs text-ember-400">Watch →</span>
    </a>
  );
}
