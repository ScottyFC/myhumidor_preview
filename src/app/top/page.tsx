import Link from 'next/link';
import { featuredCigars } from '@/lib/catalog';
import { AddToCollection } from '@/components/AddToCollection';
import { BrandTile } from '@/components/BrandTile';
import { RecentlyAdded } from '@/components/RecentlyAdded';
import { TopCigarsSections } from '@/components/TopCigarsSections';

export const metadata = {
  title: 'Cigars · MyHumidor by CigarTV',
};

export default function TopCigarsPage() {
  const cigars = featuredCigars(30);

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2">The catalog</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">
          Cigars
        </h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          Browse, rate, and track. Tap any cigar to read its profile, rate it, or add it to your
          humidor — or <Link href="/search" className="text-ember-100 underline-offset-2 hover:underline">search</Link> the
          full catalog.
        </p>
      </header>

      <TopCigarsSections />

      <div className="mb-10">
        <RecentlyAdded cigars members />
      </div>

      <div className="eyebrow mb-3">Browse the catalog</div>
      <div className="overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
        {cigars.map((c) => (
          <div
            key={c.uuid}
            className="flex items-center gap-4 border-b-[0.5px] border-ember-400/10 bg-char/40 px-4 py-4 last:border-b-0 sm:px-5"
          >
            <BrandTile name={c.brand} src={c.image_url} fit="contain" className="h-12 w-10 shrink-0 text-xs" rounded="rounded" />

            <Link href={`/cigars/${c.slug}`} className="group min-w-0 flex-1">
              <div className="eyebrow truncate">{c.brand}</div>
              <div className="truncate font-display text-base font-medium leading-tight text-paper group-hover:text-ember-100 sm:text-lg">
                {c.name} <span className="text-smoke-400">· {c.size}</span>
              </div>
              {c.country && <div className="mt-1 truncate text-xs text-smoke-400">{c.country}</div>}
            </Link>

            <AddToCollection seed={{ cigarId: c.uuid, slug: c.slug, brand: c.brand, name: c.name, size: c.size }} />
          </div>
        ))}
      </div>
    </div>
  );
}
