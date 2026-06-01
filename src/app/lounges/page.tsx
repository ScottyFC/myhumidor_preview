import Link from 'next/link';
import { Star, BadgeCheck, MapPin, ArrowRight } from 'lucide-react';
import { getTopLounges } from '@/lib/mock-data';
import { BrandTile } from '@/components/BrandTile';

export const metadata = {
  title: 'Top Lounges in the US · MyHumidor by CigarTV',
};

export default function LoungesPage() {
  const lounges = getTopLounges();

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2">Where the community gathers</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">
          Top lounges in the US
        </h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          The highest-rated cigar lounges and shops, and a peek at what they stock. Tap a lounge for
          its full profile, hours, and menu.
        </p>
      </header>

      <div className="space-y-4">
        {lounges.map((l, i) => (
          <Link
            key={l.id}
            href={`/lounges/${l.slug}`}
            className="group block rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-5 transition hover:border-ember-400/40"
          >
            <div className="flex items-start gap-4">
              <span className="mt-1 w-7 shrink-0 text-center font-display text-2xl italic tabular text-ember-400/70">
                {i + 1}
              </span>
              <BrandTile name={l.name} className="h-14 w-14 shrink-0 text-2xl" rounded="rounded-lg" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="truncate font-display text-xl font-medium group-hover:text-ember-100">
                    {l.name}
                  </h2>
                  {l.verified && <BadgeCheck size={16} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-smoke-400">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} strokeWidth={1.5} /> {l.city}, {l.state}
                  </span>
                  <span className="inline-flex items-center gap-1 text-ember-100">
                    <Star size={11} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                    <span className="tabular">{l.rating.toFixed(1)}</span>
                    <span className="tabular text-smoke-400">({l.reviewCount.toLocaleString()})</span>
                  </span>
                </div>

                {l.stocked.length > 0 && (
                  <div className="mt-3">
                    <div className="eyebrow mb-1.5">In stock</div>
                    <div className="flex flex-wrap gap-1.5">
                      {l.stocked.map((c) => (
                        <span
                          key={c.slug}
                          className="rounded-full border-[0.5px] border-ember-400/20 bg-char/60 px-2.5 py-1 text-xs text-smoke-200"
                        >
                          {c.brand} {c.line}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Lounge-owner CTA — secondary, at the bottom */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border-[0.5px] border-dashed border-ember-400/25 bg-char/40 px-6 py-5">
        <div>
          <div className="font-display text-lg">Own or manage a lounge?</div>
          <div className="text-sm text-smoke-400">
            Get the verified check, a free TV stick, and earn credits from viewership.
          </div>
        </div>
        <Link href="/lounges/join" className="btn-primary shrink-0">
          Become a verified lounge <ArrowRight size={14} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
