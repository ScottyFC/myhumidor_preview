'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, Star, MapPin, Phone, BadgeCheck, Plus } from 'lucide-react';
import type { CatalogCigar, CatalogStore } from '@/types';
import { cn, formatUSD } from '@/lib/utils';
import { AddToCollection } from '@/components/AddToCollection';
import { BrandTile } from '@/components/BrandTile';
import { FollowButton } from '@/components/FollowButton';
import { searchUsers, type UserHit } from '@/lib/users';
import { searchCatalogCigarsRemote } from '@/lib/db';

type Tab = 'cigars' | 'lounges' | 'people';

export function SearchClient() {
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('cigars');
  const [q, setQ] = useState(params.get('q') ?? '');

  const [cigars, setCigars] = useState<CatalogCigar[]>([]);
  const [cigarTotal, setCigarTotal] = useState(0);
  const [stores, setStores] = useState<CatalogStore[]>([]);
  const [storeTotal, setStoreTotal] = useState(0);
  const [users, setUsers] = useState<UserHit[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const query = q.trim();
    // keep the URL shareable
    const usp = new URLSearchParams();
    if (query) usp.set('q', query);
    router.replace(`/search${usp.toString() ? `?${usp}` : ''}`, { scroll: false });

    if (query.length < 2) {
      setCigars([]);
      setStores([]);
      setUsers([]);
      setCigarTotal(0);
      setStoreTotal(0);
      return;
    }

    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const [cRes, sRes, uRes, dbCigars] = await Promise.all([
          fetch(`/api/cigars?q=${encodeURIComponent(query)}&limit=24`).then((r) => r.json()),
          fetch(`/api/stores?q=${encodeURIComponent(query)}&limit=12`).then((r) => r.json()),
          searchUsers(query, 16),
          searchCatalogCigarsRemote(query, 24),
        ]);
        if (id === reqId.current) {
          // Merge static catalog (ranked) with live DB results so newly
          // approved cigars show up immediately. Dedup by brand+name (a DB copy
          // of a static cigar has a different slug, so slug-dedup missed it).
          const staticItems: CatalogCigar[] = cRes.items ?? [];
          const key = (c: CatalogCigar) => `${(c.brand || '').toLowerCase().trim()}|${(c.name || '').toLowerCase().trim()}`;
          const seen = new Set(staticItems.map(key));
          const extras: CatalogCigar[] = [];
          for (const c of dbCigars) { const k = key(c); if (seen.has(k)) continue; seen.add(k); extras.push(c); }
          setCigars([...extras, ...staticItems]);
          setCigarTotal((cRes.total ?? 0) + extras.length);
          setStores(sRes.items ?? []);
          setStoreTotal(sRes.total ?? 0);
          setUsers(uRes);
        }
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const showResults = q.trim().length >= 2;

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <header className="mb-6">
        <div className="eyebrow mb-2">Search</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">Find a cigar</h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          Search through thousands of Cigars and Lounges. Rate what you&apos;ve smoked, add to your humidor,
          and find who carries it. You can also search for your fellow smokers.
        </p>
      </header>

      {/* Search box */}
      <div className="relative">
        <Search size={18} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-smoke-400" />
        {loading && (
          <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-ember-400" />
        )}
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Thousands of Cigars, Lounges, Shops and Fellow Smokers"
          className="w-full rounded-lg border-[0.5px] border-ember-400/25 bg-char/70 py-3.5 pl-11 pr-11 text-base focus:border-ember-400 focus:outline-none"
        />
      </div>

      {/* Tabs */}
      {showResults && (
        <div className="mt-5 flex gap-2">
          <TabButton active={tab === 'cigars'} onClick={() => setTab('cigars')}>
            Cigars{cigarTotal > 0 && <span className="ml-1.5 tabular text-smoke-400">{fmt(cigarTotal)}</span>}
          </TabButton>
          <TabButton active={tab === 'lounges'} onClick={() => setTab('lounges')}>
            Lounges{storeTotal > 0 && <span className="ml-1.5 tabular text-smoke-400">{fmt(storeTotal)}</span>}
          </TabButton>
          <TabButton active={tab === 'people'} onClick={() => setTab('people')}>
            People{users.length > 0 && <span className="ml-1.5 tabular text-smoke-400">{fmt(users.length)}</span>}
          </TabButton>
        </div>
      )}

      {/* Results */}
      <div className="mt-6">
        {!showResults ? (
          <Suggestions onPick={setQ} />
        ) : tab === 'cigars' ? (
          <CigarResults cigars={cigars} total={cigarTotal} loading={loading} query={q.trim()} />
        ) : tab === 'lounges' ? (
          <LoungeResults stores={stores} total={storeTotal} loading={loading} />
        ) : (
          <PeopleResults users={users} loading={loading} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border-[0.5px] px-4 py-1.5 text-sm transition',
        active
          ? 'border-ember-400 bg-ember-400/15 text-ember-100'
          : 'border-ember-400/20 text-smoke-200 hover:border-ember-400/40'
      )}
    >
      {children}
    </button>
  );
}

function CigarResults({
  cigars,
  total,
  loading,
  query,
}: {
  cigars: CatalogCigar[];
  total: number;
  loading: boolean;
  query: string;
}) {
  if (cigars.length === 0) {
    return (
      <div>
        <Empty loading={loading} label="No cigars match that search." />
        {!loading && <SubmitCta query={query} />}
      </div>
    );
  }
  return (
    <>
      <div className="overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
        {cigars.map((c) => (
          <div
            key={c.uuid}
            className="flex items-center gap-3 border-b-[0.5px] border-ember-400/10 bg-char/40 px-4 py-3 last:border-b-0"
          >
            <Link href={`/cigars/${c.slug}`} className="group min-w-0 flex-1">
              <div className="truncate font-display text-base font-medium text-paper group-hover:text-ember-100">
                {c.name}
              </div>
              <div className="mt-0.5 truncate text-xs text-smoke-400">
                {c.brand} · {c.size} · {c.country}
                {c.price != null && (
                  <span className="text-smoke-200"> · MSRP {formatUSD(c.price)}</span>
                )}
              </div>
            </Link>
            <AddToCollection
              seed={{ cigarId: c.uuid, slug: c.slug, brand: c.brand, name: c.name, size: c.size }}
            />
          </div>
        ))}
      </div>
      {total > cigars.length && (
        <p className="mt-3 text-center text-xs text-smoke-400">
          Showing {cigars.length} of {fmt(total)} matches — refine your search to narrow it down.
        </p>
      )}
      <SubmitCta query={query} />
    </>
  );
}

function SubmitCta({ query }: { query: string }) {
  const href = query ? `/submit?name=${encodeURIComponent(query)}` : '/submit';
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border-[0.5px] border-dashed border-ember-400/25 bg-char/40 px-5 py-4">
      <div className="text-sm text-smoke-200">
        Don&apos;t see it? Add a cigar that isn&apos;t in the catalog.
      </div>
      <Link href={href} className="btn-primary shrink-0 text-sm">
        <Plus size={14} strokeWidth={2} /> Submit a cigar
      </Link>
    </div>
  );
}

function LoungeResults({
  stores,
  total,
  loading,
}: {
  stores: CatalogStore[];
  total: number;
  loading: boolean;
}) {
  if (stores.length === 0) {
    return <Empty loading={loading} label="No lounges match that search." />;
  }
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {stores.map((s) => (
          <div key={s.id} className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 p-4">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/lounges/${s.slug}`}
                className="font-display text-base font-medium leading-tight hover:text-ember-100"
              >
                {s.name}
              </Link>
              {s.verified && (
                <BadgeCheck size={15} strokeWidth={1.5} className="shrink-0 text-ember-400" />
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-smoke-400">
              <MapPin size={11} strokeWidth={1.5} />
              {[s.address, s.city, s.state].filter(Boolean).join(', ')}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-smoke-200">
              {s.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={11} strokeWidth={1.5} /> {s.phone}
                </span>
              )}
              <Link href={`/lounges/${s.slug}`} className="text-ember-100 hover:underline">
                View lounge →
              </Link>
            </div>
          </div>
        ))}
      </div>
      {total > stores.length && (
        <p className="mt-3 text-center text-xs text-smoke-400">
          Showing {stores.length} of {fmt(total)} lounges — refine your search.
        </p>
      )}
    </>
  );
}

function Empty({ loading, label }: { loading: boolean; label: string }) {
  if (loading) {
    return (
      <div className="py-12 text-center text-smoke-400">
        <Loader2 className="mx-auto animate-spin text-ember-400" size={22} />
      </div>
    );
  }
  return (
    <div className="rounded-lg border-[0.5px] border-dashed border-ember-400/20 p-12 text-center text-smoke-400">
      {label}
    </div>
  );
}

function Suggestions({ onPick }: { onPick: (q: string) => void }) {
  const POOL = [
    'Padron', 'Opus X', 'My Father', 'Liga Privada', 'Oliva', 'Davidoff', 'Arturo Fuente',
    'Cohiba', 'Montecristo', 'Rocky Patel', 'Ashton', 'Drew Estate', 'Plasencia', 'Tatuaje',
    'Maduro', 'Connecticut', 'Nicaragua', 'Robusto', 'Toro', 'Churchill', 'Tampa', 'Miami',
  ];
  const picks = useMemo(() => [...POOL].sort(() => Math.random() - 0.5).slice(0, 7), []);
  return (
    <div>
      <div className="eyebrow mb-3">Popular searches</div>
      <div className="flex flex-wrap gap-2">
        {picks.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-ember-400/20 px-3.5 py-1.5 text-sm text-smoke-200 transition hover:border-ember-400/50 hover:text-paper"
          >
            <Star size={11} strokeWidth={1.5} className="text-ember-400" />
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function PeopleResults({ users, loading }: { users: UserHit[]; loading: boolean }) {
  if (users.length === 0) {
    return <Empty loading={loading} label="No members match that search." />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {users.map((u) => (
        <div
          key={u.handle}
          className="flex items-center gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 p-3"
        >
          <Link href={`/u/${u.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatarUrl} alt={u.displayName} className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <BrandTile name={u.displayName} className="h-10 w-10 shrink-0 text-base" rounded="rounded-full" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1 truncate font-medium hover:text-ember-100">
                {u.displayName}
                {u.accountType === 'retailer' && (
                  <BadgeCheck size={13} strokeWidth={1.5} className="shrink-0 text-ember-400" />
                )}
              </div>
              <div className="truncate text-xs text-smoke-400">@{u.handle}</div>
            </div>
          </Link>
          <FollowButton handle={u.handle} size="sm" />
        </div>
      ))}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString();
}
