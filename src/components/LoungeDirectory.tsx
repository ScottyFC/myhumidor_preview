'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BadgeCheck, MapPin } from 'lucide-react';
import { BrandTile } from '@/components/BrandTile';
import { VenueTag } from '@/components/VenueTag';
import type { CatalogStore } from '@/types';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'lounge' | 'retail';

/** Directory grid with a sit-down-lounge vs retailer filter + per-card tags. */
export function LoungeDirectory({ lounges }: { lounges: CatalogStore[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const isRetail = (l: CatalogStore) => l.venue_type === 'retail';
  const isLounge = (l: CatalogStore) => l.venue_type !== 'retail'; // lounge / both / unknown
  const shown = lounges.filter((l) => (filter === 'all' ? true : filter === 'retail' ? isRetail(l) : isLounge(l)));

  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'lounge', label: 'Sit-down lounges' },
    { id: 'retail', label: 'Retailers' },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={cn(
              'rounded-full border-[0.5px] px-3.5 py-1.5 text-xs font-medium transition',
              filter === t.id
                ? 'border-ember-400/50 bg-ember-400/15 text-ember-100'
                : 'border-ember-400/15 text-smoke-300 hover:text-ember-100'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-smoke-500">
        “Sit-down lounges” are venues you can smoke at. “Retailers” (liquor and big-box stores) sell
        cigars but aren’t smoking lounges.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((l) => (
          <Link
            key={l.id}
            href={`/lounges/${l.slug}`}
            className="group relative flex items-start gap-4 overflow-hidden rounded-xl border-[0.5px] border-ember-400/15 bg-gradient-to-b from-char/70 to-char/30 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ember-400/45 hover:shadow-[0_10px_28px_rgba(0,0,0,0.4)]"
          >
            <BrandTile name={l.name} src={l.image_url} className="h-12 w-12 shrink-0 text-lg" rounded="rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate font-display text-base font-medium group-hover:text-ember-100">{l.name}</h2>
                {l.verified && <BadgeCheck size={14} strokeWidth={1.5} className="shrink-0 text-ember-400" />}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-smoke-400">
                <MapPin size={11} strokeWidth={1.5} /> {[l.city, l.state].filter(Boolean).join(', ')}
              </div>
              <div className="mt-2">
                <VenueTag type={l.venue_type} size="sm" />
              </div>
            </div>
          </Link>
        ))}
        {shown.length === 0 && (
          <p className="text-sm text-smoke-400">No {filter === 'retail' ? 'retailers' : 'lounges'} in this view.</p>
        )}
      </div>
    </>
  );
}
