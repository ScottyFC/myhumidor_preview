'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Box, Heart, Star, Plus } from 'lucide-react';
import type { CollectionItem } from '@/lib/collection';
import type { UserRating } from '@/lib/ratings';
import { cn } from '@/lib/utils';

type Tab = 'humidor' | 'wishlist' | 'ratings';

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
  const [tab, setTab] = useState<Tab>('humidor');

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'humidor', label: 'Humidor', count: humidor.length },
    { id: 'wishlist', label: 'Wishlist', count: wishlist.length },
    { id: 'ratings', label: 'Ratings', count: ratings.length },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full border-[0.5px] px-4 py-1.5 text-sm transition',
              tab === t.id
                ? 'border-ember-400 bg-ember-400/15 text-ember-100'
                : 'border-ember-400/20 text-smoke-200 hover:border-ember-400/40'
            )}
          >
            {t.label} <span className="tabular text-smoke-400">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'ratings' ? (
        ratings.length === 0 ? (
          <Empty self={self} label="No ratings yet." cta="Rate a cigar" />
        ) : (
          <div className="space-y-2">
            {ratings.map((r) => (
              <Link
                key={r.cigarId}
                href={`/cigars/${r.slug}`}
                className="flex items-center gap-4 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4 transition hover:border-ember-400/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="eyebrow truncate">{r.brand}</div>
                  <div className="truncate font-display text-base font-medium">{r.name}</div>
                  <div className="text-xs text-smoke-400">{r.size}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="inline-flex items-center gap-1 font-display text-xl tabular text-ember-100">
                    <Star size={14} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
                    {r.overall.toFixed(1)}
                  </div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-wider text-smoke-400">
                    F {r.flavor} · B {r.burn} · A {r.appearance}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        <CollectionGrid
          items={tab === 'humidor' ? humidor : wishlist}
          kind={tab}
          self={self}
        />
      )}
    </div>
  );
}

function CollectionGrid({
  items,
  kind,
  self,
}: {
  items: CollectionItem[];
  kind: 'humidor' | 'wishlist';
  self: boolean;
}) {
  if (items.length === 0) {
    return (
      <Empty
        self={self}
        label={kind === 'humidor' ? 'Humidor is empty.' : 'Wishlist is empty.'}
        cta="Find cigars"
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((i) => (
        <Link
          key={i.cigarId}
          href={`/cigars/${i.slug}`}
          className="group flex items-center gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4 transition hover:border-ember-400/40"
        >
          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-gradient-to-b from-leather to-leather-deep">
            <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-ember-600 border-y border-ember-400/40" />
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
      ))}
    </div>
  );
}

function Empty({ self, label, cta }: { self: boolean; label: string; cta: string }) {
  return (
    <div className="rounded-lg border-[0.5px] border-dashed border-ember-400/20 p-10 text-center">
      <div className="text-sm text-smoke-400">{label}</div>
      {self && (
        <Link href="/search" className="btn-primary mt-4">
          <Plus size={14} strokeWidth={2} /> {cta}
        </Link>
      )}
    </div>
  );
}
