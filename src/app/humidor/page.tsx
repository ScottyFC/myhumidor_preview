'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, Box, Trash2, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeAuth, type Session } from '@/lib/auth';
import { Feed } from '@/components/Feed';
import { AgingTracker } from '@/components/AgingTracker';
import { subscribeAficionado } from '@/lib/aficionado';
import {
  type CollectionItem,
  getCollection,
  onCollectionChange,
  remove as removeFromCollection,
  toggleStatus,
} from '@/lib/collection';

type Filter = 'all' | 'humidor' | 'wishlist' | 'smoked';

// Display model for the user's saved collection.
interface Row {
  cigarId: string;
  slug: string;
  brand: string;
  name: string;
  size: string;
  status: 'humidor' | 'wishlist' | 'smoked';
  quantity?: number;
  yourRating?: number;
  removable: boolean;
}

export default function HumidorPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<'feed' | 'collection'>('feed');
  const [userItems, setUserItems] = useState<CollectionItem[]>([]);
  const [member, setMember] = useState(false);
  const [authState, setAuthState] = useState<'checking' | 'in' | 'out'>('checking');
  const [slowAuth, setSlowAuth] = useState(false);
  const [displayName, setDisplayName] = useState('Your');

  useEffect(() => {
    let settled = false;
    const unsub = subscribeAuth((s: Session | null) => {
      settled = true;
      setSlowAuth(false);
      if (s) {
        // Retailers have no humidor — their inventory lives on the dashboard.
        if (s.type === 'retailer') { router.replace('/dashboard'); return; }
        setAuthState('in');
        setDisplayName(s.displayName || 'Your');
      } else {
        setAuthState('out');
        router.replace('/register?next=/humidor');
      }
    });
    // If auth resolution stalls (token refresh can deadlock on tab refocus),
    // don't spin forever — surface a retry after 6s instead of hanging.
    const t = setTimeout(() => { if (!settled) setSlowAuth(true); }, 6000);
    return () => { clearTimeout(t); unsub(); };
  }, [router]);

  useEffect(() => subscribeAficionado(setMember), []);

  useEffect(() => {
    const sync = () => setUserItems(getCollection());
    sync();
    return onCollectionChange(sync);
  }, []);

  const rows: Row[] = userItems.map((i) => ({
    cigarId: i.cigarId,
    slug: i.slug,
    brand: i.brand,
    name: i.name,
    size: i.size,
    status: i.status,
    removable: true,
  }));

  const humidorRows = rows.filter((r) => r.status === 'humidor');
  const wishlistRows = rows.filter((r) => r.status === 'wishlist');
  const smokedRows = rows.filter((r) => r.status === 'smoked');
  const visible =
    filter === 'all' ? rows : filter === 'humidor' ? humidorRows : filter === 'wishlist' ? wishlistRows : smokedRows;

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'humidor', label: 'Humidor', count: humidorRows.length },
    { id: 'wishlist', label: 'Wishlist', count: wishlistRows.length },
    { id: 'smoked', label: 'Smoked', count: smokedRows.length },
  ];

  if (authState !== 'in') {
    return (
      <div className="mx-auto max-w-5xl px-6 pt-20 text-center text-smoke-400">
        {slowAuth ? (
          <div className="space-y-4">
            <p className="text-sm">This is taking longer than usual to load your humidor.</p>
            <button onClick={() => window.location.reload()} className="btn-primary text-sm">
              Reload
            </button>
          </div>
        ) : (
          <Loader2 className="mx-auto animate-spin text-ember-400" size={24} />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <header className="mb-8">
        <div className="eyebrow mb-2">{displayName}&apos;s collection</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">My Humidor</h1>
        <div className="mt-3 flex gap-6 text-sm text-smoke-200 tabular">
          <span>
            <span className="font-display text-lg text-paper">{humidorRows.length}</span> in humidor
          </span>
          <span>
            <span className="font-display text-lg text-paper">{wishlistRows.length}</span> wishlisted
          </span>
          <span>
            <span className="font-display text-lg text-paper">{smokedRows.length}</span> smoked
          </span>
        </div>
      </header>

      {/* Feed / Collection toggle */}
      <div className="mb-6 flex gap-2 border-b border-ember-400/15">
        {(['feed', 'collection'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              '-mb-px border-b-2 px-1 pb-3 text-sm font-medium capitalize transition',
              view === v
                ? 'border-ember-400 text-paper'
                : 'border-transparent text-smoke-400 hover:text-smoke-100'
            )}
          >
            {v === 'feed' ? 'Feed' : 'My collection'}
          </button>
        ))}
      </div>

      {view === 'feed' ? (
        <Feed />
      ) : (
        <>
          <div className="mb-8">
            <AgingTracker humidor={userItems.filter((i) => i.status === 'humidor')} member={member} />
          </div>
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
                {filter === 'wishlist' ? 'Your wishlist is empty.' : 'Nothing here yet.'}
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
        </>
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
        <span />
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
