import Link from 'next/link';
import { BadgeCheck, MapPin, ArrowRight } from 'lucide-react';
import { rotatingLounges, catalogStats } from '@/lib/catalog';
import { boostedLounges } from '@/lib/featured-server';
import { BrandTile } from '@/components/BrandTile';
import { RecentlyAdded } from '@/components/RecentlyAdded';
import { SubmitLounge } from '@/components/SubmitLounge';
import { NearbyLounges } from '@/components/NearbyLounges';
import { LoungeDirectory } from '@/components/LoungeDirectory';

export const metadata = {
  title: 'Lounges · MyHumidor by CigarTV',
};

export const revalidate = 3600; // rotation window refresh

export default async function LoungesPage() {
  // Boosting pins a lounge to the front; everyone else rides the 4-hour rotation.
  const boosted = await boostedLounges(6);
  const seen = new Set(boosted.map((b) => b.slug));
  const lounges = [...boosted, ...rotatingLounges(80).filter((l) => !seen.has(l.slug))].slice(0, 60);
  const { stores } = catalogStats();

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2">Where the community gathers</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">Lounges & Shops</h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          {stores.toLocaleString()} cigar lounges and shops across the country. Tap one for its
          profile, hours, and menu.
        </p>
      </header>

      <div className="mb-8">
        <NearbyLounges />
      </div>

      <div className="mb-10">
        <RecentlyAdded lounges shops />
      </div>

      <LoungeDirectory lounges={lounges} />

      {/* Submit your lounge */}
      <div className="mt-8">
        <SubmitLounge />
      </div>

      {/* Lounge-owner CTA — secondary, at the bottom */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border-[0.5px] border-dashed border-ember-400/25 bg-char/40 px-6 py-5">
        <div>
          <div className="font-display text-lg">Own or manage a lounge?</div>
          <div className="text-sm text-smoke-400">
            Create a retailer account to claim your lounge or submit a new one for review.
          </div>
        </div>
        <Link href="/register?type=retailer" className="btn-primary shrink-0">
          Create a retailer account <ArrowRight size={14} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
