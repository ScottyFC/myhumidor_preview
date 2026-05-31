'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Heart, Box, Trash2, Plus } from 'lucide-react';
import { MOCK_HUMIDOR, MOCK_USER } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import {
  type CollectionItem,
  getCollection,
  onCollectionChange,
  remove as removeFromCollection,
  toggleStatus,
} from '@/lib/collection';

type Filter = 'all' | 'humidor' | 'wishlist';

// Display model unifying the demo seed and the user's saved collection.
interface Row {
  cigarId: string;
  slug: string;
  brand: string;
  name: string;
  size: string;
  status: 'humidor' | 'wishlist';
  quantity?: number;
  yourRating?: number;
  removable: boolean;
}

const SEED_ROWS: Row[] = MOCK_HUMIDOR.map((e) => ({
  cigarId: e.cigar.id,
  slug: e.cigar.slug,
  brand: e.cigar.brand,
  name: e.cigar.line,
  size: e.cigar.vitola,
  status: 'humidor',
  quantity: e.quantity,
  yourRating: e.yourRating,
  removable: false,
}));

export default function HumidorPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [userItems, setUserItems] = useState<CollectionItem[]>([]);

  useEffect(() => {
    const sync = () => setUserItems(getCollection());
    sync();
    return onCollectionChange(sync);
  }, []);

  const userRows: Row[] = userItems.map((i) => ({
    cigarId: i.cigarId,
    slug: i.slug,
    brand: i.brand,
    name: i.name,
    size: i.size,
    status: i.status,
    removable: true,
  }));

  // user items override any seed duplicate
  const userIds = new Set(userRows.map((r) => r.cigarId));
  const rows = [...userRows, ...SEED_ROWS.filter((r) => !userIds.has(r.cigarId))];

  const humidorRows = rows.filter((r) => r.status === 'humidor');
  const wishlistRows = rows.filter((r) => r.status === 'wishlist');
  const visible =
    filter === 'all' ? rows : filter === 'humidor' ? humidorRows : wishlistRows;

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'humidor', label: 'Humidor', count: humidorRows.length },
    { id: 'wishlist', label: 'Wishlist', count: wishlistRows.length },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2">{MOCK_USER.displayName}&apos;s collection</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">My Humidor</h1>
        <div className="mt-3 flex gap-6 text-sm text-smoke-200 tabular">
          <span>
            <span className="font-display text-lg text-paper">{humidorRows.length}</span> in humidor
          </span>
          <span>
            <span className="font-display text-lg text-paper">{wishlistRows.length}</span> wishlisted
          </span>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm transition border-[0.5px]',
              filter === f.id
                ? 'bg-ember-600 border-ember-400 text-paper'
                : 'border-ember-400/20 text-smoke-200 hover:border-ember-400/40'
            )}
          >
            {f.label} <span className="tabular text-smoke-400">{f.count}</span>
          </button>
        ))}
        <Link href="/search" className="btn-ghost ml-auto text-xs">
          <Plus size={13} strokeWidth={2} /> Add cigars
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border-[0.5px] border-dashed border-ember-400/20 p-12 text-center">
          <div className="text-smoke-400">
            {filter === 'wishlist'
              ? 'Your wishlist is empty.'
              : 'Nothing here yet.'}
          </div>
          <Link href="/search" className="btn-primary mt-4">
            <Plus size={14} strokeWidth={2} /> Find cigars
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((r) => (
            <Row key={r.cigarId} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ row }: { row: Row }) {
  return (
    <div className="group flex gap-4 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4">
      <Link href={`/cigars/${row.slug}`} className="flex min-w-0 flex-1 gap-4">
        <div className="relative h-16 w-12 shrink-0 items-center overflow-hidden rounded bg-gradient-to-b from-leather to-leather-deep">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-ember-600 border-y border-ember-400/40" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow truncate">{row.brand}</div>
          <div className="font-display text-base font-medium leading-tight text-paper group-hover:text-ember-100">
            {row.name}
          </div>
          <div className="mt-1 text-xs text-smoke-400">
            {row.size}
            {row.quantity !== undefined && ` · ×${row.quantity}`}
          </div>
          <div className="mt-2">
            {row.status === 'wishlist' ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-ember-100">
                <Heart size={11} strokeWidth={1.5} className="fill-ember-400 text-ember-400" /> Wishlist
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-smoke-300">
                <Box size={11} strokeWidth={1.5} className="text-ember-400" /> Humidor
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex shrink-0 flex-col items-end justify-between">
        {row.yourRating ? (
          <span className="inline-flex items-center gap-1 text-sm tabular text-ember-100">
            <Star size={12} strokeWidth={1.5} className="fill-ember-400 text-ember-400" />
            {row.yourRating.toFixed(1)}
          </span>
        ) : (
          <span />
        )}
        {row.removable && (
          <div className="flex items-center gap-1">
            {row.status === 'wishlist' && (
              <button
                onClick={() =>
                  toggleStatus(
                    { cigarId: row.cigarId, slug: row.slug, brand: row.brand, name: row.name, size: row.size },
                    'humidor'
                  )
                }
                title="Move to humidor"
                aria-label="Move to humidor"
                className="flex h-7 w-7 items-center justify-center rounded-md border-[0.5px] border-ember-400/20 text-smoke-300 transition hover:border-ember-400/50 hover:text-ember-100"
              >
                <Box size={13} strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={() => removeFromCollection(row.cigarId)}
              title="Remove"
              aria-label="Remove"
              className="flex h-7 w-7 items-center justify-center rounded-md border-[0.5px] border-ember-400/20 text-smoke-400 transition hover:border-red-400/50 hover:text-red-400"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
