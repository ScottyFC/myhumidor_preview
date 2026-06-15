import Link from 'next/link';
import type { CatalogCigar } from '@/types';
import { BrandLogo } from '@/components/BrandLogo';
import { AutoScrollRow } from '@/components/AutoScrollRow';

/**
 * Horizontal, endlessly-scrolling row of cigar tiles — used for "More from
 * {brand}" and "Cigars similar to this" on cigar pages.
 */
export function CigarRow({ title, eyebrowIcon, cigars }: { title: string; eyebrowIcon?: React.ReactNode; cigars: CatalogCigar[] }) {
  if (cigars.length === 0) return null;
  return (
    <div className="mt-12">
      <h2 className="eyebrow mb-3 flex items-center gap-1.5">{eyebrowIcon}{title}</h2>
      <AutoScrollRow className="-mx-6 px-6 pb-2">
        {cigars.map((c) => (
          <Link key={c.uuid} href={`/cigars/${c.slug}`} className="group w-40 shrink-0 transition-transform duration-200 hover:-translate-y-1">
            <div className="relative">
              <BrandLogo brand={c.brand} src={c.image_url} fit="contain" rounded="rounded-xl"
                className="aspect-[4/5] w-full text-3xl transition group-hover:ring-1 group-hover:ring-ember-400/50" />
              {typeof c.price === 'number' && (
                <span className="absolute bottom-2 right-2 rounded-md bg-char/90 px-1.5 py-0.5 font-display text-xs tabular text-ember-100 ring-1 ring-ember-400/20">
                  ${c.price}
                </span>
              )}
            </div>
            <div className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-ember-100">{c.name}</div>
            <div className="truncate text-xs text-smoke-400">{c.brand}{c.size ? ` · ${c.size}` : ''}</div>
          </Link>
        ))}
      </AutoScrollRow>
    </div>
  );
}
