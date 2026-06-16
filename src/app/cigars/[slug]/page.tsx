import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { getCigarSocial } from '@/lib/mock-data';
import { findCatalogCigarBySlug, featuredLounges, moreFromBrand, similarCigars } from '@/lib/catalog';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase';
import { RatingBar } from '@/components/RatingStars';
import { RatingForm } from '@/components/RatingForm';
import { MyCigarRatings } from '@/components/MyCigarRatings';
import { CigarCommunity } from '@/components/CigarCommunity';
import { AddToCollection } from '@/components/AddToCollection';
import { BrandLogo } from '@/components/BrandLogo';
import { StockNearYou } from '@/components/StockNearYou';
import { CigarPhotos } from '@/components/CigarPhotos';
import { CigarReviews } from '@/components/CigarReviews';
import { CigarImageUpload } from '@/components/CigarImageUpload';
import { CigarRow } from '@/components/CigarRow';
import { AdminOnlyId } from '@/components/AdminOnlyId';
import { AdminCigarActions } from '@/components/AdminCigarActions';
import { ChangeRequest } from '@/components/ChangeRequest';
import { formatUSD } from '@/lib/utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Unified view model so curated (rated) and catalog (unrated) cigars share one layout. */
interface CigarView {
  id: string;
  brand: string;
  headline: string;
  vitola: string;
  wrapper?: string;
  lengthIn?: number;
  ringGauge?: number;
  country?: string;
  msrp?: number | null;
  imageUrl?: string | null;
  rated: boolean;
  ratingCount: number;
  flavorAvg: number;
  burnAvg: number;
  appearanceAvg: number;
  overallAvg: number;
}

export default async function CigarPage({ params }: PageProps) {
  const { slug } = await params;

  // Every cigar resolves from the real 23.7k-row catalog.
  let cat = findCatalogCigarBySlug(slug);
  // Approved submissions live only in the DB until the next static rebuild.
  if (!cat && isSupabaseConfigured) {
    const sb = await supabaseServer();
    const { data } = await sb
      .from('catalog_cigars')
      .select('id, brand, name, country, price, size, slug, image_url')
      .eq('slug', slug)
      .single();
    if (data) {
      cat = {
        uuid: data.id, brand: data.brand, name: data.name, country: data.country ?? '',
        price: data.price, size: data.size ?? '', slug: data.slug, image_url: data.image_url ?? null,
      };
    }
  }
  if (!cat) notFound();

  // Community averages come from the live `ratings` table once users start
  // rating. Until then every cigar shows the "not yet rated" state.
  const view: CigarView = {
    id: cat.uuid,
    brand: cat.brand,
    headline: cat.name,
    vitola: cat.size,
    country: cat.country,
    msrp: cat.price,
    imageUrl: cat.image_url ?? null,
    rated: false,
    ratingCount: 0,
    flavorAvg: 0,
    burnAvg: 0,
    appearanceAvg: 0,
    overallAvg: 0,
  };

  const nearby = featuredLounges(3);
  const social = getCigarSocial(view.id);
  const brandMore = moreFromBrand(slug, 12);
  const similar = similarCigars(slug, 12);

  return (
    <div className="mx-auto max-w-5xl px-6 pt-6">
      <Link
        href="/search"
        className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-smoke-400 hover:text-paper"
      >
        <ArrowLeft size={12} strokeWidth={1.5} /> Search
      </Link>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* ─── Visual ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-5">
          <BrandLogo
            brand={view.brand}
            src={view.imageUrl}
            fit="contain"
            rounded="rounded-xl"
            className="aspect-[4/5] w-full text-6xl"
          />
          <CigarImageUpload slug={slug} brand={view.brand} />
        </div>

        {/* ─── Header + Aggregates ───────────────────────────────────── */}
        <div className="lg:col-span-7">
          <div className="eyebrow mb-2">{view.brand}</div>
          <h1 className="font-display text-4xl leading-[1.0] tracking-tightest sm:text-5xl">
            {view.headline}
          </h1>
          <div className="mt-3 text-lg text-smoke-200 italic">
            {[view.vitola, view.wrapper].filter(Boolean).join(' · ')}
          </div>
          <AdminOnlyId id={view.id} label="Cigar UUID" />
          <div><AdminCigarActions slug={slug} name={`${view.brand} ${view.headline}`} /></div>

          <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-ember-400/15 py-4 text-sm">
            {view.lengthIn != null && <Stat label="Length" value={`${view.lengthIn}″`} />}
            {view.ringGauge != null && <Stat label="Ring" value={String(view.ringGauge)} />}
            {view.country && <Stat label="Origin" value={view.country} />}
            {view.msrp != null && <Stat label="MSRP" value={formatUSD(view.msrp)} />}
          </dl>

          {view.rated ? (
            <div className="mt-6">
              <div className="eyebrow mb-3">Community average</div>
              <div className="space-y-3">
                <RatingBar label="Flavor" value={view.flavorAvg} />
                <RatingBar label="Burn" value={view.burnAvg} />
                <RatingBar label="Appearance" value={view.appearanceAvg} />
              </div>
              <div className="mt-4 flex items-baseline justify-between border-t border-ember-400/10 pt-4">
                <div>
                  <div className="eyebrow">Overall</div>
                  <div className="font-display text-3xl tabular">
                    {view.overallAvg.toFixed(1)}
                    <span className="text-base text-smoke-400"> / 5</span>
                  </div>
                </div>
                <div className="text-xs tabular text-smoke-400">
                  {view.ratingCount.toLocaleString()} ratings
                </div>
              </div>
              <div className="mt-5">
                <AddToCollection variant="full" seed={{ cigarId: view.id, slug, brand: view.brand, name: view.headline, size: view.vitola }} />
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border-[0.5px] border-ember-400/20 bg-ember-400/5 p-5">
              <div className="font-display text-lg">Not yet rated</div>
              <p className="mt-1 text-sm text-smoke-300">
                This cigar is in the catalog but no one has rated it yet. Be the first.
              </p>
              <div className="mt-4">
                <AddToCollection variant="full" seed={{ cigarId: view.id, slug, brand: view.brand, name: view.headline, size: view.vitola }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Rating Form ──────────────────────────────────────────────── */}
      <div className="mt-12">
        <MyCigarRatings cigarId={view.id} slug={slug} />
        <RatingForm
          seed={{ cigarId: view.id, slug, brand: view.brand, name: view.headline, size: view.vitola }}
        />
      </div>

      {/* ─── Community: likes + comments ──────────────────────────────── */}
      <div className="mt-8">
        <CigarCommunity social={social} />
      </div>

      {/* ─── Suggest a correction ─────────────────────────────────────── */}
      <div className="mt-6">
        <ChangeRequest targetType="cigar" targetId={slug} targetName={`${view.brand} ${view.headline}`} />
      </div>

      <CigarPhotos slug={slug} />

      <CigarReviews slug={slug} />

      <CigarRow
        title={`More from ${view.brand}`}
        cigars={brandMore}
      />

      <CigarRow
        title="Cigars similar to this"
        cigars={similar}
      />

      <StockNearYou slug={slug} />

      {/* ─── Nearby in stock ──────────────────────────────────────────── */}
      <div className="mt-12">
        <h2 className="eyebrow mb-3 flex items-center gap-1.5">
          <MapPin size={11} strokeWidth={1.5} className="text-ember-400" />
          Lounges to explore
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {nearby.map((l) => (
            <Link
              key={l.id}
              href={`/lounges/${l.slug}`}
              className="group rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4 transition hover:border-ember-400/40"
            >
              <div className="flex items-center justify-between">
                <div className="font-display text-base font-medium group-hover:text-ember-100">{l.name}</div>
                {l.verified && (
                  <span className="rounded bg-ember-400/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-ember-100">
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-smoke-400">{l.city}, {l.state}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="font-display text-xl mt-0.5">{value}</dd>
    </div>
  );
}
