import Link from 'next/link';
import { getTopCigars } from '@/lib/mock-data';
import { AddToCollection } from '@/components/AddToCollection';

export const metadata = {
  title: 'Top Cigars in the US · MyHumidor by CigarTV',
};

export default function TopCigarsPage() {
  const ranked = getTopCigars(15);

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2">Editor&apos;s lineup</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">
          Top cigars in the US <span className="italic text-ember-400">right now</span>
        </h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          A starting lineup of notable cigars to explore. Tap any to read the full profile, rate it,
          or add it to your humidor. Once the community starts rating, this ranks by score.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
        {ranked.map(({ rank, cigar }) => (
          <div
            key={cigar.id}
            className="flex items-center gap-4 border-b-[0.5px] border-ember-400/10 bg-char/40 px-4 py-4 last:border-b-0 sm:px-5"
          >
            <div className="w-8 shrink-0 text-center">
              <span className="font-display text-2xl italic tabular text-ember-400/70">{rank}</span>
            </div>

            <Link href={`/cigars/${cigar.slug}`} className="group min-w-0 flex-1">
              <div className="eyebrow truncate">{cigar.brand}</div>
              <div className="truncate font-display text-base font-medium leading-tight text-paper group-hover:text-ember-100 sm:text-lg">
                {cigar.line} <span className="text-smoke-400">· {cigar.vitola}</span>
              </div>
              <div className="mt-1 truncate text-xs text-smoke-400">{cigar.wrapper}</div>
            </Link>

            <AddToCollection seed={{ cigarId: cigar.id, slug: cigar.slug, brand: cigar.brand, name: cigar.line, size: cigar.vitola }} />
          </div>
        ))}
      </div>
    </div>
  );
}
