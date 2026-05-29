import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { findCigarBySlug, MOCK_LOUNGES, getCigarSocial } from '@/lib/mock-data';
import { RatingBar } from '@/components/RatingStars';
import { RatingForm } from '@/components/RatingForm';
import { CigarCommunity } from '@/components/CigarCommunity';
import { AddToHumidorButton } from '@/components/AddToHumidorButton';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CigarPage({ params }: PageProps) {
  const { slug } = await params;
  const cigar = findCigarBySlug(slug);
  if (!cigar) notFound();

  const nearby = MOCK_LOUNGES.filter((l) => l.verified).slice(0, 3);
  const social = getCigarSocial(cigar.id);

  return (
    <div className="mx-auto max-w-5xl px-6 pt-6">
      <Link
        href="/humidor"
        className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-smoke-400 hover:text-paper"
      >
        <ArrowLeft size={12} strokeWidth={1.5} /> Back
      </Link>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* ─── Visual ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-5">
          <div className="aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-b from-leather to-leather-deep">
            <div className="flex h-full flex-col justify-center">
              {/* Stylized cigar band */}
              <div className="mx-auto h-10 w-full bg-ember-600 border-y border-ember-100/20 flex items-center justify-center">
                <div className="font-display italic text-xs tracking-widest text-ember-50">
                  {cigar.brand}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Header + Aggregates ───────────────────────────────────── */}
        <div className="lg:col-span-7">
          <div className="eyebrow mb-2">{cigar.brand}</div>
          <h1 className="font-display text-5xl leading-[0.95] tracking-tightest">
            {cigar.line}
          </h1>
          <div className="mt-3 text-lg text-smoke-200 italic">
            {cigar.vitola} · {cigar.wrapper}
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-ember-400/15 py-4 text-sm">
            <Stat label="Length" value={`${cigar.lengthIn}″`} />
            <Stat label="Ring" value={String(cigar.ringGauge)} />
            <Stat label="Origin" value={cigar.countryOfOrigin} />
          </dl>

          <div className="mt-6">
            <div className="eyebrow mb-3">Community average</div>
            <div className="space-y-3">
              <RatingBar label="Flavor" value={cigar.flavorAvg} />
              <RatingBar label="Burn" value={cigar.burnAvg} />
              <RatingBar label="Appearance" value={cigar.appearanceAvg} />
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-ember-400/10 pt-4">
              <div>
                <div className="eyebrow">Overall</div>
                <div className="font-display text-3xl tabular">
                  {cigar.overallAvg.toFixed(1)}
                  <span className="text-base text-smoke-400"> / 5</span>
                </div>
              </div>
              <div className="text-xs tabular text-smoke-400">
                {cigar.ratingCount.toLocaleString()} ratings
              </div>
            </div>
            <div className="mt-5">
              <AddToHumidorButton cigarId={cigar.id} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Rating Form ──────────────────────────────────────────────── */}
      <div className="mt-12">
        <RatingForm cigarId={cigar.id} />
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
