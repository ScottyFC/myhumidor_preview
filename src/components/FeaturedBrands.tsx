import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import type { FeaturedBrand } from '@/lib/catalog';

/** Horizontal rail of featured brands → brand pages. */
export function FeaturedBrands({ brands }: { brands: FeaturedBrand[] }) {
  if (!brands.length) return null;
  return (
    <div className="-mr-6 flex gap-3 overflow-x-auto pr-6 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {brands.map((b) => (
        <Link
          key={b.slug}
          href={`/brands/${b.slug}`}
          className="group flex w-28 shrink-0 flex-col items-center gap-2 rounded-xl border-[0.5px] border-ember-400/12 bg-char/40 p-3 transition hover:border-ember-400/40"
        >
          <BrandLogo brand={b.brand} src={b.image_url} className="h-12 w-12 rounded-lg" />
          <div className="w-full truncate text-center text-xs font-medium text-smoke-200 group-hover:text-ember-100">{b.brand}</div>
          <div className="text-[10px] text-smoke-500">{b.count} cigars</div>
        </Link>
      ))}
    </div>
  );
}
