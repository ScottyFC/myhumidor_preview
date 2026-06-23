import Link from 'next/link';
import { Tv } from 'lucide-react';
import { burnRateEpisodes, hasAired, fmtAirDate, BURN_RATE_LOGO } from '@/lib/burnrate';
import { CigarName } from '@/components/CigarName';
import { safeImg } from '@/lib/img';

/** Home-page carousel of cigars featured on CigarTV's Burn Rate: episode thumbnail,
 *  Burn Rate score (once aired), and a link to the cigar's page. */
export function BurnRateCarousel() {
  const eps = burnRateEpisodes();
  if (eps.length === 0) return null;

  return (
    <section className="mt-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="eyebrow flex items-center gap-1.5"><Tv size={13} className="text-ember-400" /> Featured on
          {/* black-on-transparent logo → invert in dark mode */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BURN_RATE_LOGO} alt="Burn Rate" className="ml-1.5 inline h-4 w-auto align-middle dark:invert" />
        </span>
        <Link href="/shows/burn-rate" className="text-xs text-ember-400 hover:underline">View all</Link>
      </div>

      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {eps.map((ep) => {
          const aired = hasAired(ep);
          return (
            <Link key={ep.slug + ep.airDate} href={`/cigars/${ep.slug}`} className="group w-64 shrink-0 snap-start">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border-[0.5px] border-ember-400/15 bg-char">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={safeImg(ep.thumbnail)} alt={ep.cigarName} className="h-full w-full object-cover transition group-hover:scale-[1.03]" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {aired && ep.score != null ? (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-sm font-semibold text-ember-300 backdrop-blur">
                    {ep.score.toFixed(1)}<span className="text-[10px] font-normal text-smoke-300">Burn Rate</span>
                  </span>
                ) : (
                  <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] text-smoke-200 backdrop-blur">
                    Airs {fmtAirDate(ep.airDate)}
                  </span>
                )}
              </div>
              <div className="mt-2 truncate text-sm font-medium"><CigarName slug={ep.slug} name={ep.cigarName} mode="name" /></div>
              <div className="truncate text-xs text-smoke-400">{aired ? `Aired ${fmtAirDate(ep.airDate)}` : 'Upcoming episode'}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
