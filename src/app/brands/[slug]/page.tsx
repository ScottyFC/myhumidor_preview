import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Boxes, ArrowLeft } from 'lucide-react';
import { cigarsByBrand, brandSlug } from '@/lib/catalog';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';
import type { CatalogCigar } from '@/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const { brand } = cigarsByBrand(slug);
  return { title: `${brand ?? 'Brand'} · MyHumidor by CigarTV` };
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;
  const { brand, cigars } = cigarsByBrand(slug);

  // Merge any user-submitted cigars for this brand from the database.
  const merged: CatalogCigar[] = [...cigars];
  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      const { data } = await sb
        .from('catalog_cigars')
        .select('id, brand, name, country, price, size, slug')
        .limit(500);
      for (const r of data ?? []) {
        if (brandSlug(r.brand as string) !== slug) continue;
        if (merged.some((m) => m.slug === r.slug)) continue;
        merged.push({
          uuid: String(r.id), brand: r.brand as string, name: r.name as string,
          country: (r.country as string) ?? '', price: (r.price as number) ?? null,
          size: (r.size as string) ?? '', slug: r.slug as string,
        });
      }
    } catch { /* ignore */ }
  }

  const label = brand ?? (merged[0]?.brand ?? null);
  if (!label || merged.length === 0) notFound();

  merged.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <Link href="/search" className="mb-6 inline-flex items-center gap-1.5 text-xs text-smoke-400 hover:text-ember-100">
        <ArrowLeft size={13} strokeWidth={1.5} /> Search the catalog
      </Link>

      <div className="eyebrow mb-2 flex items-center gap-2">
        <Boxes size={14} strokeWidth={1.5} className="text-ember-400" /> Brand
      </div>
      <h1 className="font-display text-5xl tracking-tightest">{label}</h1>
      <p className="mt-2 text-sm text-smoke-400">
        {merged.length} {merged.length === 1 ? 'cigar' : 'cigars'} on MyHumidor
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {merged.map((c) => (
          <Link
            key={c.slug}
            href={`/cigars/${c.slug}`}
            className="group rounded-xl border-[0.5px] border-ember-400/15 bg-char/50 p-4 transition hover:border-ember-400/40"
          >
            <div className="font-display text-lg leading-snug group-hover:text-ember-100">{c.name}</div>
            <div className="mt-1 text-xs text-smoke-400">
              {[c.size, c.country].filter(Boolean).join(' · ')}
            </div>
            {typeof c.price === 'number' && (
              <div className="mt-2 font-display text-base tabular text-ember-100">${c.price.toFixed(2)}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
