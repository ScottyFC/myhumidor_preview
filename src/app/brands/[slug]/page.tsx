import Link from 'next/link';
import { CigarName } from '@/components/CigarName';
import { notFound } from 'next/navigation';
import { Boxes, ArrowLeft } from 'lucide-react';
import { cigarsByBrand, brandSlug, findCatalogCigarBySlug } from '@/lib/catalog';
import { applyOverrides, applyOverride, loadOverrides } from '@/lib/overrides';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';
import type { CatalogCigar } from '@/types';
import { BrandLogo } from '@/components/BrandLogo';
import { BrandAnnouncements } from '@/components/BrandAnnouncements';
import { CigarThumb } from '@/components/CigarThumb';
import { BrandCsvDownload } from '@/components/BrandCsvDownload';

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

  // Merge any user-submitted cigars for this brand from the database. Query by
  // slug prefix (cigar slugs start with the brand slug) so we never miss a new
  // brand's cigars behind an arbitrary row cap.
  const merged: CatalogCigar[] = [...cigars];
  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      const { data } = await sb
        .from('catalog_cigars')
        .select('id, brand, name, country, price, size, slug')
        .or(`slug.eq.${slug},slug.ilike.${slug}-%`)
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
  if (!label || merged.length === 0) {
    // Even with no static match, an override may have moved cigars into this brand.
  }

  const visible = await applyOverrides(merged);
  // Keep only cigars whose *effective* (post-override) brand matches this page…
  const pooled: typeof visible = visible.filter((c) => brandSlug(c.brand) === slug);
  const have = new Set(pooled.map((c) => c.slug));
  // …and pull in cigars an admin renamed *into* this brand from elsewhere.
  const ov = await loadOverrides();
  for (const [s, o] of ov) {
    if (o.removed || !o.brand || brandSlug(o.brand) !== slug || have.has(s)) continue;
    const base = findCatalogCigarBySlug(s);
    if (!base) continue;
    const m = await applyOverride(base);
    if (m && brandSlug(m.brand) === slug) { pooled.push(m); have.add(s); }
  }

  const finalLabel = pooled[0]?.brand ?? label;
  if (!finalLabel || pooled.length === 0) notFound();

  // Collapse any duplicate rows (e.g. a static cigar plus a re-submitted DB copy
  // under a different slug) by normalized brand+name.
  const dKey = (c: typeof pooled[number]) => `${(c.brand || '').toLowerCase().trim()}|${(c.name || '').toLowerCase().trim()}`;
  const dseen = new Set<string>();
  const deduped = pooled.filter((c) => { const k = dKey(c); if (dseen.has(k)) return false; dseen.add(k); return true; });
  deduped.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <Link href="/search" className="mb-6 inline-flex items-center gap-1.5 text-xs text-smoke-400 hover:text-ember-100">
        <ArrowLeft size={13} strokeWidth={1.5} /> Search the catalog
      </Link>

      <div className="eyebrow mb-2 flex items-center gap-2">
        <Boxes size={14} strokeWidth={1.5} className="text-ember-400" /> Brand
      </div>
      <div className="flex items-center gap-4">
        <BrandLogo brand={finalLabel} className="h-16 w-16 shrink-0 text-2xl" rounded="rounded-xl" />
        <div>
          <h1 className="font-display text-5xl tracking-tightest">{finalLabel}</h1>
          <p className="mt-1 text-sm text-smoke-400">
            {deduped.length} {deduped.length === 1 ? 'cigar' : 'cigars'} on MyHumidor
          </p>
        </div>
      </div>

      <BrandCsvDownload brand={finalLabel} rows={deduped.map((c) => ({
        slug: c.slug, brand: c.brand, name: c.name, country: c.country,
        price: c.price ?? null, image_url: c.image_url ?? null, buy_url: c.buyUrl ?? null,
      }))} />

      <div className="mt-8">
        <BrandAnnouncements slug={slug} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deduped.map((c) => (
          <Link
            key={c.slug}
            href={`/cigars/${c.slug}`}
            className="group flex gap-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/50 p-4 transition hover:-translate-y-0.5 hover:border-ember-400/40"
          >
            <CigarThumb slug={c.slug} brand={c.brand} src={c.image_url} fit="contain" rounded="rounded" className="h-16 w-12 shrink-0 text-xs" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg leading-snug group-hover:text-ember-100"><CigarName slug={c.slug} name={c.name} /></div>
              <div className="mt-1 text-xs text-smoke-400">
                {[c.size, c.country].filter(Boolean).join(' · ')}
              </div>
              {typeof c.price === 'number' && (
                <div className="mt-2 font-display text-base tabular text-ember-100">${c.price.toFixed(2)}</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
