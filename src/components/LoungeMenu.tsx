'use client';
import { CigarThumb } from '@/components/CigarThumb';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatUSD } from '@/lib/utils';
import { getPublishedMenu, type InventoryItem } from '@/lib/inventory';
import { LoungeComingSoon } from '@/components/LoungeComingSoon';

export function LoungeMenu({ slug, storeId, fallbackCount }: { slug: string; storeId?: string; fallbackCount?: number }) {
  const [items, setItems] = useState<InventoryItem[] | null>(null);

  useEffect(() => {
    let off = false;
    getPublishedMenu(slug, storeId).then((m) => !off && setItems(m));
    return () => {
      off = true;
    };
  }, [slug, storeId]);

  if (items === null) return null; // hydrating

  const comingSoon = items.filter((i) => i.comingSoon);
  const inStock = items.filter((i) => !i.comingSoon);

  if (items.length === 0) {
    return (
      <p className="text-smoke-400">
        {fallbackCount
          ? `${fallbackCount} cigars in stock. The live menu appears here once the lounge publishes it from the dashboard.`
          : 'No live menu yet. When this lounge publishes inventory, what they carry shows here — and links into your humidor.'}
      </p>
    );
  }

  return (
    <>
    {inStock.length > 0 && (
    <div className="overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
      {inStock.map((it) => {
        const Row = (
          <div className="flex items-center justify-between gap-3 border-b-[0.5px] border-ember-400/10 bg-char/40 px-4 py-3 last:border-b-0">
            <div className="flex min-w-0 items-center gap-3">
              <CigarThumb slug={it.slug} brand={it.brand} fit="contain" rounded="rounded" className="h-12 w-10 shrink-0 text-[10px]" />
              <div className="min-w-0">
                <div className="eyebrow truncate">{it.brand}</div>
                <div className="truncate text-sm font-medium">{it.name}</div>
                <div className="text-xs text-smoke-400">{it.size}</div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm tabular text-ember-100">{formatUSD(it.price)}</div>
              <div className="text-[11px] tabular text-smoke-400">{it.quantity} in stock</div>
            </div>
          </div>
        );
        return it.slug ? (
          <Link key={it.cigarId} href={`/cigars/${it.slug}`} className="block transition hover:bg-ember-400/5">
            {Row}
          </Link>
        ) : (
          <div key={it.cigarId}>{Row}</div>
        );
      })}
    </div>
    )}
    {comingSoon.length > 0 && <LoungeComingSoon slug={slug} items={comingSoon} />}
    </>
  );
}
