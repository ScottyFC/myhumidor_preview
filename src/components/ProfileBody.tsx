'use client';

import Link from 'next/link';
import { Box, Heart, Star, Plus } from 'lucide-react';
import type { CollectionItem } from '@/lib/collection';
import type { UserRating } from '@/lib/ratings';
import { AutoScrollRow } from '@/components/AutoScrollRow';

// Mirror of catalog.brandSlug (catalog is server-only, so we inline it here).
function slugifyBrand(b: string): string {
  return b.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function ProfileBody({
  humidor,
  wishlist,
  ratings,
  self,
}: {
  humidor: CollectionItem[];
  wishlist: CollectionItem[];
  ratings: UserRating[];
  self: boolean;
}) {
  const brands = Array.from(
    new Set(
      [...humidor, ...wishlist, ...ratings]
        .map((i) => i.brand?.trim())
        .filter((b): b is string => !!b)
    )
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-10">
      {brands.length > 0 && (
        <Section title="Brands" count={brands.length}>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <Link
                key={b}
                href={`/brands/${slugifyBrand(b)}`}
                className="rounded-full border-[0.5px] border-ember-400/25 bg-char/50 px-3.5 py-1.5 text-xs text-smoke-200 transition hover:border-ember-400/60 hover:text-ember-100"
              >
                {b}
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section title="Humidor" count={humidor.length}>
        {humidor.length === 0 ? (
          <Empty self={self} label="Humidor is empty." cta="Find cigars" />
        ) : (
          <AutoScrollRow className="-mx-6 px-6 pb-2">
            {humidor.map((i) => <CollectionCard key={i.cigarId} i={i} kind="humidor" />)}
          </AutoScrollRow>
        )}
      </Section>

      <Section title="Wishlist" count={wishlist.length}>
        {wishlist.length === 0 ? (
          <Empty self={self} label="Wishlist is empty." cta="Find cigars" />
        ) : (
          <AutoScrollRow className="-mx-6 px-6 pb-2">
            {wishlist.map((i) => <CollectionCard key={i.cigarId} i={i} kind="wishlist" />)}
          </AutoScrollRow>
        )}
      </Section>

      <Section title="Ratings" count={ratings.length}>
        {ratings.length === 0 ? (
          <Empty self={self} label="No ratings yet." cta="Rate a cigar" />
        ) : (
          <AutoScrollRow className="-mx-6 px-6 pb-2">
            {ratings.map((r) => (
              <Link
                key={r.cigarId}
                href={`/cigars/${r.slug}`}
                className="w-56 shrink-0 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4 transition hover:border-ember-400/40"
              >
                <div className="eyebrow truncate">{r.brand}</div>
                <div className="truncate font-display text-base font-medium">{r.name}</div>
                <div className="text-xs text-smoke-400">{r.size}</div>
                <div className="mt-2 inline-flex items-center gap-1 font-display text-xl tabular text-ember-100">
                  <Star size={14} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                  {r.overall.toFixed(1)}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-smoke-400">
                  F {r.flavor} · B {r.burn} · A {r.appearance}
                </div>
              </Link>
            ))}
          </AutoScrollRow>
        )}
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="font-display text-2xl tracking-tightest">{title}</h2>
        <span className="tabular text-sm text-smoke-400">{count}</span>
      </div>
      {children}
    </div>
  );
}

function CollectionCard({ i, kind }: { i: CollectionItem; kind: 'humidor' | 'wishlist' }) {
  return (
    <Link
      href={`/cigars/${i.slug}`}
      className="group flex w-56 shrink-0 items-center gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4 transition hover:border-ember-400/40"
    >
      <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-gradient-to-b from-leather to-leather-deep">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 border-y border-ember-400/40 bg-ember-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="eyebrow truncate">{i.brand}</div>
        <div className="truncate text-sm font-medium group-hover:text-ember-100">{i.name}</div>
        <div className="text-xs text-smoke-400">{i.size}</div>
      </div>
      {kind === 'humidor' ? (
        <Box size={14} strokeWidth={1.5} className="shrink-0 text-ember-400" />
      ) : (
        <Heart size={14} strokeWidth={1.5} className="shrink-0 fill-ember-400 text-ember-400" />
      )}
    </Link>
  );
}

function Empty({ self, label, cta }: { self: boolean; label: string; cta: string }) {
  return (
    <div className="rounded-lg border-[0.5px] border-dashed border-ember-400/20 p-8 text-center">
      <div className="text-sm text-smoke-400">{label}</div>
      {self && (
        <Link href="/search" className="btn-primary mt-4">
          <Plus size={14} strokeWidth={2} /> {cta}
        </Link>
      )}
    </div>
  );
}
