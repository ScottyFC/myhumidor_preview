import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { findCigarBySlug, MOCK_LOUNGES, getCigarSocial } from '@/lib/mock-data';
import { findCatalogCigarBySlug } from '@/lib/catalog';
import { RatingBar } from '@/components/RatingStars';
import { RatingForm } from '@/components/RatingForm';
import { CigarCommunity } from '@/components/CigarCommunity';
import { AddToHumidorButton } from '@/components/AddToHumidorButton';
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
  rated: boolean;
  ratingCount: number;
  flavorAvg: number;
  burnAvg: number;
  appearanceAvg: number;
  overallAvg: number;
}

export default async function CigarPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. Curated cigar with community ratings?
  const rich = findCigarBySlug(slug);
  // 2. Otherwise look it up in the full 23.5k catalog.
  const cat = rich ? null : findCatalogCigarBySlug(slug);
  if (!rich && !cat) notFound();

  const view: CigarView = rich
    ? {
        id: rich.id,
        brand: rich.brand,
        headline: rich.line,
        vitola: rich.vitola,
        wrapper: rich.wrapper,
        lengthIn: rich.lengthIn,
        ringGauge: rich.ringGauge,
        country: rich.countryOfOrigin,
        msrp: rich.msrp,
        rated: true,
        ratingCount: rich.ratingCount,
        flavorAvg: rich.flavorAvg,
        burnAvg: rich.burnAvg,
        appearanceAvg: rich.appearanceAvg,
        overallAvg: rich.overallAvg,
      }
    : {
        id: cat!.uuid,
        brand: cat!.brand,
        headline: cat!.name,
        vitola: cat!.size,
        country: cat!.country,
        msrp: cat!.price,
        rated: false,
        ratingCount: 0,
        flavorAvg: 0,
        burnAvg: 0,
        appearanceAvg: 0,
        overallAvg: 0,
      };

  const nearby = MOCK_LOUNGES.filter((l) => l.verified).slice(0, 3);
  const social = getCigarSocial(view.id);

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
          <div className="aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-b from-leather to-leather-deep">
            <div className="flex h-full flex-col justify-center">
              <div className="mx-auto h-10 w-full bg-ember-600 border-y border-ember-100/20 flex items-center justify-center">
                <div className="font-display italic text-xs tracking-widest text-ember-50">
                  {view.brand}
                </div>
              </div>
            </div>
          </div>
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
                <AddToHumidorButton cigarId={view.id} />
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border-[0.5px] border-ember-400/20 bg-ember-400/5 p-5">
              <div className="font-display text-lg">Not yet rated</div>
              <p className="mt-1 text-sm text-smoke-300">
                This cigar is in the catalog but no one has rated it yet. Be the first.
              </p>
              <div className="mt-4">
                <AddToHumidorButton cigarId={view.id} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Rating Form ──────────────────────────────────────────────── */}
      <div className="mt-12">
        <RatingForm cigarId={view.id} />
      </div>

      {/* ─── Community: likes + comments ──────────────────────────────── */}
      <div className="mt-8">
        <CigarCommunity social={social} />
      </div>

      {/* ─── Nearby in stock ──────────────────────────────────────────── */}
      <div className="mt-12">
        <h2 className="eyebrow mb-3 flex items-center gap-1.5">
          <MapPin size={11} strokeWidth={1.5} className="text-ember-400" />
          Nearby lounges with this in stock
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {nearby.map((l) => (
            <div key={l.id} className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4">
              <div className="flex items-center justify-between">
                <div className="font-display text-base font-medium">{l.name}</div>
                {l.verified && (
                  <span className="rounded bg-ember-400/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-ember-100">
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-smoke-400">{l.city}, {l.state}</div>
              <div className="mt-2 text-xs tabular text-ember-100">
                {l.distanceMi?.toFixed(1)} mi away
              </div>
            </div>
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
