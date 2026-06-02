import Link from 'next/link';
import { BadgeCheck, MapPin, ArrowRight } from 'lucide-react';
import { browseLounges, catalogStats } from '@/lib/catalog';
import { BrandTile } from '@/components/BrandTile';
import { RecentlyAdded } from '@/components/RecentlyAdded';
import { SubmitLounge } from '@/components/SubmitLounge';

export const metadata = {
  title: 'Lounges · MyHumidor by CigarTV',
};

export default function LoungesPage() {
  const lounges = browseLounges(60);
  const { stores } = catalogStats();

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2">Where the community gathers</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">Lounges</h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          {stores.toLocaleString()} cigar lounges and shops across the country. Tap one for its
          profile, hours, and menu. Find the closest ones on the{' '}
          <Link href="/map" className="text-ember-100 underline-offset-2 hover:underline">map</Link>.
        </p>
      </header>

      <div className="mb-10">
        <RecentlyAdded lounges members />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {lounges.map((l) => (
          <Link
            key={l.id}
            href={`/lounges/${l.slug}`}
            className="group flex items-start gap-4 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4 transition hover:border-ember-400/40"
          >
            <BrandTile name={l.name} className="h-12 w-12 shrink-0 text-lg" rounded="rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate font-display text-base font-medium group-hover:text-ember-100">
                  {l.name}
                </h2>
                {l.verified && <BadgeCheck size={14} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-smoke-400">
                <MapPin size={11} strokeWidth={1.5} /> {[l.city, l.state].filter(Boolean).join(', ')}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Submit your lounge */}
      <div className="mt-8">
        <SubmitLounge />
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
