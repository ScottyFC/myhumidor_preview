import Link from 'next/link';
import { Star, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { getTopCigars, type Trend } from '@/lib/mock-data';
import { AddToHumidorButton } from '@/components/AddToHumidorButton';

export const metadata = {
  title: 'Top Cigars in the US · MyHumidor by CigarTV',
};

export default function TopCigarsPage() {
  const ranked = getTopCigars(15);

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2">Updated weekly</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">
          Top cigars in the US <span className="italic text-ember-400">right now</span>
        </h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          Ranked by the MyHumidor community — a blend of average rating and rating volume over the
          last 30 days. Tap any cigar to read the full profile, or add it straight to your humidor.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
        {ranked.map(({ rank, trend, cigar }) => (
          <div
            key={cigar.id}
            className="flex items-center gap-4 border-b-[0.5px] border-ember-400/10 bg-char/40 px-4 py-4 last:border-b-0 sm:px-5"
          >
            {/* Rank + trend */}
            <div className="flex w-10 shrink-0 flex-col items-center">
              <span className="font-display text-2xl italic tabular text-ember-400/70">{rank}</span>
              <TrendBadge trend={trend} />
            </div>

            {/* Cigar */}
            <Link href={`/cigars/${cigar.slug}`} className="group min-w-0 flex-1">
              <div className="eyebrow truncate">{cigar.brand}</div>
              <div className="truncate font-display text-base font-medium leading-tight text-paper group-hover:text-ember-100 sm:text-lg">
                {cigar.line} <span className="text-smoke-400">· {cigar.vitola}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-smoke-400">
                <Star size={12} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                <span className="tabular font-medium text-ember-100">{cigar.overallAvg.toFixed(1)}</span>
                <span className="tabular">· {cigar.ratingCount.toLocaleString()} ratings</span>
                <span className="hidden sm:inline">· {cigar.wrapper}</span>
              </div>
            </Link>

            {/* Action */}
            <AddToHumidorButton cigarId={cigar.id} size="sm" className="shrink-0" />
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-smoke-400">
        Rankings are example data. In production this query aggregates the{' '}
        <code className="text-ember-100">ratings</code> table — average score weighted by recent
        volume — and recomputes nightly.
      </p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: Trend }) {
  const map = {
    up: { icon: TrendingUp, cls: 'text-emerald-400', label: 'up' },
    down: { icon: TrendingDown, cls: 'text-red-400', label: 'down' },
    same: { icon: Minus, cls: 'text-smoke-400', label: 'no change' },
    new: { icon: Sparkles, cls: 'text-ember-400', label: 'new' },
  } as const;
  const { icon: Icon, cls, label } = map[trend];
  return (
    <span className={`mt-0.5 ${cls}`} title={label} aria-label={label}>
      <Icon size={13} strokeWidth={1.75} />
    </span>
  );
}
