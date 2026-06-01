import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Phone, Mail, Globe, Clock, BadgeCheck } from 'lucide-react';
import type { CatalogStore } from '@/types';
import { mockLoungeAsStore } from '@/lib/mock-data';
import { findCatalogStoreBySlug } from '@/lib/catalog';
import { ClaimLounge } from '@/components/ClaimLounge';
import { BrandTile } from '@/components/BrandTile';
import { LoungeMenu } from '@/components/LoungeMenu';
import { AdminOnlyId } from '@/components/AdminOnlyId';
import { ChangeRequest } from '@/components/ChangeRequest';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface LoungeView extends CatalogStore {
  inventoryCount?: number;
}

export default async function LoungePage({ params }: PageProps) {
  const { slug } = await params;

  // Resolve from the demo lounges first (rich), then the 713 imported stores.
  const demo = mockLoungeAsStore(slug);
  const cat = demo ? null : findCatalogStoreBySlug(slug);
  if (!demo && !cat) notFound();

  const lounge: LoungeView = (demo ?? (cat as CatalogStore)) as LoungeView;
  const fullAddress = [lounge.address, lounge.city, lounge.state].filter(Boolean).join(', ');

  return (
    <div className="mx-auto max-w-4xl px-6 pt-6">
      <Link
        href="/search"
        className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-smoke-400 hover:text-paper"
      >
        <ArrowLeft size={12} strokeWidth={1.5} /> Search
      </Link>

      {/* Header */}
      <header className="border-b border-ember-400/15 pb-8">
        <div className="flex items-center gap-4">
          <BrandTile
            name={lounge.name}
            src={lounge.image_url}
            className="h-16 w-16 shrink-0 text-2xl"
            rounded="rounded-xl"
          />
          <div className="eyebrow">{lounge.city}, {lounge.state}</div>
        </div>
        <h1 className="mt-4 flex flex-wrap items-center gap-3 font-display text-5xl tracking-tightest sm:text-6xl">
          {lounge.name}
          {lounge.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-ember-400/15 px-3 py-1 text-xs font-medium uppercase tracking-widest text-ember-100">
              <BadgeCheck size={14} strokeWidth={1.5} className="text-ember-400" />
              Verified
            </span>
          )}
        </h1>

        <div className="mt-5 grid gap-2 text-sm text-smoke-200 sm:grid-cols-2">
          {fullAddress && (
            <div className="flex items-center gap-2">
              <MapPin size={14} strokeWidth={1.5} className="text-ember-400" /> {fullAddress}
            </div>
          )}
          {lounge.phone && (
            <div className="flex items-center gap-2">
              <Phone size={14} strokeWidth={1.5} className="text-ember-400" /> {lounge.phone}
            </div>
          )}
          {lounge.email && (
            <div className="flex items-center gap-2">
              <Mail size={14} strokeWidth={1.5} className="text-ember-400" />
              <a href={`mailto:${lounge.email}`} className="hover:text-ember-100">{lounge.email}</a>
            </div>
          )}
          {lounge.website && (
            <div className="flex items-center gap-2">
              <Globe size={14} strokeWidth={1.5} className="text-ember-400" />
              <a
                href={lounge.website.startsWith('http') ? lounge.website : `https://${lounge.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-ember-100"
              >
                {lounge.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {lounge.hours && (
            <div className="flex items-center gap-2">
              <Clock size={14} strokeWidth={1.5} className="text-ember-400" /> {lounge.hours}
            </div>
          )}
        </div>
      </header>

      {/* Menu / inventory */}
      <section className="border-b border-ember-400/15 py-8">
        <div className="eyebrow mb-3">On the menu</div>
        <LoungeMenu storeId={lounge.id} fallbackCount={lounge.inventoryCount} />
        <div className="mt-4">
          <AdminOnlyId id={lounge.id} label="Lounge UUID" />
        </div>
      </section>

      {/* Claim */}
      <section className="border-b border-ember-400/15 py-8">
        <ClaimLounge store={lounge} alreadyVerified={!!lounge.verified} />
      </section>

      {/* Suggest a correction */}
      <section className="py-8">
        <ChangeRequest targetType="lounge" targetId={lounge.id} targetName={lounge.name} />
      </section>
    </div>
  );
}
