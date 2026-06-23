import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tv } from 'lucide-react';
import { burnRateEpisodes, hasAired, fmtAirDate, BURN_RATE_LOGO } from '@/lib/burnrate';
import { CigarName } from '@/components/CigarName';
import { safeImg } from '@/lib/img';

export function generateStaticParams() {
  return [{ slug: 'burn-rate' }];
}

export default async function ShowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== 'burn-rate') notFound();
  const eps = burnRateEpisodes();

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <Link href="/" className="eyebrow mb-6 inline-flex items-center gap-1 text-smoke-400 hover:text-paper"><ArrowLeft size={13} /> Home</Link>
      <div className="mb-2 eyebrow flex items-center gap-1.5"><Tv size={13} className="text-ember-400" /> Featured on CigarTV</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BURN_RATE_LOGO} alt="Burn Rate" className="h-10 w-auto dark:invert" />
      <p className="mt-3 max-w-2xl text-smoke-200">Cigars put to the test on Burn Rate — with the score from each episode.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {eps.map((ep) => {
          const aired = hasAired(ep);
          return (
            <Link key={ep.slug + ep.airDate} href={`/cigars/${ep.slug}`} className="group rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-3 transition hover:border-ember-400/30">
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-char">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={safeImg(ep.thumbnail)} alt={ep.cigarName} className="h-full w-full object-cover transition group-hover:scale-[1.03]" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                {aired && ep.score != null ? (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-sm font-semibold text-ember-300 backdrop-blur">{ep.score.toFixed(1)} <span className="text-[10px] font-normal text-smoke-300">Burn Rate</span></span>
                ) : (
                  <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] text-smoke-200 backdrop-blur">Airs {fmtAirDate(ep.airDate)}</span>
                )}
              </div>
              <div className="mt-2 truncate text-sm font-medium"><CigarName slug={ep.slug} name={ep.cigarName} mode="name" /></div>
              <div className="truncate text-xs text-smoke-400">{aired ? `Aired ${fmtAirDate(ep.airDate)}` : 'Upcoming episode'}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
