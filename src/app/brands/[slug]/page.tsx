import Link from 'next/link';
import { CigarName } from '@/components/CigarName';
import { notFound } from 'next/navigation';
import { FollowBrandButton } from '@/components/FollowBrandButton';
import { BrandBadgeShowcase } from '@/components/BrandBadgeShowcase';
import { CigarStatusBadge } from '@/components/CigarStatusBadge';
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
  const statusBySlug = new Map<string, string>();
  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      const { data } = await (sb as unknown as import('@supabase/supabase-js').SupabaseClient)
        .from('catalog_cigars')
        .select('id, brand, name, country, price, size, slug, status, image_url')
        .or(`slug.eq.${slug},slug.ilike.${slug}-%`)
        .limit(500);
      for (const r of data ?? []) {
        if (brandSlug(r.brand as string) !== slug) continue;
        if ((r as { status?: string }).status) statusBySlug.set(r.slug as string, (r as { status?: string }).status as string);
        if (merged.some((m) => m.slug === r.slug)) continue;
        merged.push({
          uuid: String(r.id), brand: r.brand as string, name: r.name as string,
          country: (r.country as string) ?? '', price: (r.price as number) ?? null,
          size: (r.size as string) ?? '', slug: r.slug as string,
          image_url: ((r as { image_url?: string }).image_url) ?? undefined,
        });
      }
    } catch { /* ignore */ }
  }

  const label = brand ?? (merged[0]?.brand ?? null);

  // Approved brands exist in the DB even with zero catalog cigars — load the row so the
  // page renders (with logo/bio/announcements) the moment a brand is approved.
  type DbBrand = { id: string; name: string; logo_url: string | null; banner_url: string | null; description: string | null; tier: string | null; verified?: boolean | null };
  let dbBrand: DbBrand | null = null;
  if (isSupabaseConfigured) {
    try {
      const sb = await supabaseServer();
      const { data } = await (sb as unknown as import('@supabase/supabase-js').SupabaseClient).from('brands').select('id, name, logo_url, banner_url, description, tier, verified').eq('slug', slug).maybeSingle();
      dbBrand = (data as unknown as DbBrand | null) ?? null;
    } catch { /* ignore */ }
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

  // Wholesale link: only for lounge owners (admins), only when this brand is enrolled
  // (verified + has active box listings).
  let showWholesaleLink = false;
  if (isSupabaseConfigured && dbBrand?.id) {
    try {
      const sb = await supabaseServer();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const sbc = sb as unknown as import('@supabase/supabase-js').SupabaseClient;
        const { data: owned } = await sbc.from('lounges').select('id').eq('owner_id', user.id).limit(1);
        const isLoungeOwner = !!(owned && owned.length);
        const verified = dbBrand.tier === 'premium' || dbBrand.verified === true;
        if (isLoungeOwner && verified) {
          const { count } = await sbc.from('brand_wholesale_listings').select('*', { count: 'exact', head: true }).eq('brand_id', dbBrand.id).eq('status', 'active');
          showWholesaleLink = (count ?? 0) > 0;
        }
      }
    } catch { /* ignore */ }
  }

  const finalLabel = pooled[0]?.brand ?? label ?? dbBrand?.name ?? null;
  if (!finalLabel || (pooled.length === 0 && !dbBrand)) notFound();

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
        {dbBrand?.logo_url
          ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={dbBrand.logo_url} alt={finalLabel} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          : <BrandLogo brand={finalLabel} className="h-16 w-16 shrink-0 text-2xl" rounded="rounded-xl" />}
        <div>
          <h1 className="font-display text-5xl tracking-tightest">{finalLabel}</h1>
          <p className="mt-1 text-sm text-smoke-400">
            {deduped.length} {deduped.length === 1 ? 'cigar' : 'cigars'} on MyHumidor
          </p>
        </div>
      </div>
      {dbBrand?.description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-smoke-200">{dbBrand.description}</p>}
      {dbBrand?.id && <div className="mt-4 flex flex-wrap items-center gap-3"><FollowBrandButton brandId={dbBrand.id} />{showWholesaleLink && <a href="/dashboard?tab=wholesale" className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper transition hover:bg-ember-300"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> Place a wholesale order</a>}</div>}
      {dbBrand?.id && <BrandBadgeShowcase brandId={dbBrand.id} />}

      <BrandCsvDownload brand={finalLabel} rows={deduped.map((c) => ({
        slug: c.slug, brand: c.brand, name: c.name, country: c.country,
        price: c.price ?? null, image_url: c.image_url ?? null, buy_url: c.buyUrl ?? null,
      }))} />

      <div className="mt-8">
        <BrandAnnouncements slug={slug} />
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deduped.length === 0 && (
          <p className="col-span-full rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-6 text-sm text-smoke-400">No cigars listed yet — check back soon.</p>
        )}
        {deduped.map((c) => (
          <Link
            key={c.slug}
            href={`/cigars/${c.slug}`}
            className="group flex gap-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/50 p-4 transition hover:-translate-y-0.5 hover:border-ember-400/40"
          >
            <CigarThumb slug={c.slug} brand={c.brand} src={c.image_url} fit="contain" rounded="rounded" className="h-16 w-12 shrink-0 text-xs" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <div className="font-display text-lg leading-snug group-hover:text-ember-100"><CigarName slug={c.slug} name={c.name} /></div>
                <CigarStatusBadge status={statusBySlug.get(c.slug)} />
              </div>
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
