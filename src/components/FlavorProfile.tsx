'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Crown, MapPin, Loader2 } from 'lucide-react';
import { BrandTile } from '@/components/BrandTile';
import { AutoScrollRow } from '@/components/AutoScrollRow';
import type { CollectionItem } from '@/lib/collection';
import type { UserRating } from '@/lib/ratings';

interface Rec {
  slug: string; name: string; brand: string; country: string | null;
  size: string; price: number | null; image_url?: string;
}

export function FlavorProfile({
  member, humidor, wishlist, ratings,
}: {
  member: boolean; humidor: CollectionItem[]; wishlist: CollectionItem[]; ratings: UserRating[];
}) {
  const [recs, setRecs] = useState<Rec[] | null>(null);

  useEffect(() => {
    if (!member) return;
    const likedSlugs = ratings.filter((r) => r.overall >= 4).map((r) => r.slug);
    const ownedSlugs = [...humidor, ...wishlist].map((c) => c.slug);
    if (likedSlugs.length === 0) { setRecs([]); return; }
    let off = false;
    fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ likedSlugs, ownedSlugs }),
    })
      .then((r) => r.json())
      .then((d) => !off && setRecs(d.items ?? []))
      .catch(() => !off && setRecs([]));
    return () => { off = true; };
  }, [member, humidor, wishlist, ratings]);

  if (!member) {
    return (
      <div className="mt-12 rounded-2xl border-[0.5px] border-ember-400/25 bg-gradient-to-b from-ember-400/10 to-char/40 p-6">
        <div className="flex items-center gap-2">
          <Sparkles size={16} strokeWidth={1.5} className="text-ember-400" />
          <h2 className="font-display text-xl tracking-tightest">Flavor Profiling</h2>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full border-[0.5px] border-ember-400/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ember-100">
            <Crown size={10} strokeWidth={1.5} /> Aficionado
          </span>
        </div>
        <p className="mt-2 text-sm text-smoke-300">
          Get personalized picks based on the cigars you rate highest — and where to find them.
        </p>
        <Link href="/account?upgrade=aficionado" className="btn-primary mt-4 inline-flex text-sm">Unlock with Aficionado</Link>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={16} strokeWidth={1.5} className="text-ember-400" />
        <h2 className="font-display text-2xl tracking-tightest">Recommended for you</h2>
      </div>
      {recs === null ? (
        <div className="py-8 text-center"><Loader2 className="mx-auto animate-spin text-ember-400" size={20} /></div>
      ) : recs.length === 0 ? (
        <p className="text-sm text-smoke-400">Rate a few cigars 4★ or higher and we’ll start profiling your palate.</p>
      ) : (
        <>
          <AutoScrollRow className="-mx-6 px-6 pb-2">
            {recs.map((c) => (
              <Link key={c.slug} href={`/cigars/${c.slug}`} className="group w-44 shrink-0">
                <BrandTile name={c.brand} src={c.image_url} fit="contain" rounded="rounded-xl"
                  className="aspect-[4/5] w-full text-4xl transition group-hover:ring-1 group-hover:ring-ember-400/40" />
                <div className="mt-2 truncate text-sm font-medium group-hover:text-ember-100">{c.name}</div>
                <div className="truncate text-xs text-smoke-400">{c.brand}{c.country ? ` · ${c.country}` : ''}</div>
              </Link>
            ))}
          </AutoScrollRow>
          <Link href="/lounges" className="mt-3 inline-flex items-center gap-1 text-xs text-ember-100 hover:underline">
            <MapPin size={12} strokeWidth={1.5} /> Find these at a lounge near you
          </Link>
        </>
      )}
    </div>
  );
}
