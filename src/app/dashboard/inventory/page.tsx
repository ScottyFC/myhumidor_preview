'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Plus, Trash2, Store, Check, Lock, Package, Loader2,
} from 'lucide-react';
import type { CatalogCigar, CatalogStore, InventoryItem } from '@/types';
import { cn, formatUSD } from '@/lib/utils';

const STORE_KEY = 'myhumidor:active-store';
const invKey = (storeId: string) => `myhumidor:inventory:${storeId}`;

export default function InventoryPage() {
  const [store, setStore] = useState<CatalogStore | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load active store + its inventory from localStorage on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE_KEY);
      if (s) {
        const parsed: CatalogStore = JSON.parse(s);
        setStore(parsed);
        const inv = localStorage.getItem(invKey(parsed.id));
        if (inv) setItems(JSON.parse(inv));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist inventory whenever it changes
  useEffect(() => {
    if (!hydrated || !store) return;
    try {
      localStorage.setItem(invKey(store.id), JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, store, hydrated]);

  function selectStore(s: CatalogStore) {
    setStore(s);
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
    try {
      const inv = localStorage.getItem(invKey(s.id));
      setItems(inv ? JSON.parse(inv) : []);
    } catch {
      setItems([]);
    }
  }

  function addCigar(c: CatalogCigar) {
    setItems((prev) => {
      if (prev.some((i) => i.cigarId === c.uuid)) return prev; // already in
      return [
        {
          cigarId: c.uuid,
          brand: c.brand,
          name: c.name,
          size: c.size,
          price: c.price ?? 0,
          quantity: 1,
        },
        ...prev,
      ];
    });
  }

  function update(cigarId: string, patch: Partial<InventoryItem>) {
    setItems((prev) => prev.map((i) => (i.cigarId === cigarId ? { ...i, ...patch } : i)));
  }

  function remove(cigarId: string) {
    setItems((prev) => prev.filter((i) => i.cigarId !== cigarId));
  }

  const totals = useMemo(() => {
    const units = items.reduce((s, i) => s + i.quantity, 0);
    const value = items.reduce((s, i) => s + i.quantity * i.price, 0);
    return { skus: items.length, units, value };
  }, [items]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-6 pt-20 text-center text-smoke-400">
        <Loader2 className="mx-auto animate-spin text-ember-400" size={24} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-smoke-400 hover:text-paper"
      >
        <ArrowLeft size={12} strokeWidth={1.5} /> Dashboard
      </Link>

      <div className="mb-6 flex items-center gap-2 rounded-md border-[0.5px] border-ember-400/20 bg-ember-400/5 px-4 py-2 text-xs text-smoke-200">
        <Lock size={12} strokeWidth={1.5} className="text-ember-400" />
        Inventory is private to your lounge. Items you mark in stock surface to nearby users and to
        episodes featuring those cigars.
      </div>

      <header className="mb-8">
        <div className="eyebrow mb-2">Lounge dashboard</div>
        <h1 className="font-display text-5xl tracking-tightest sm:text-6xl">Inventory</h1>
        <p className="mt-3 max-w-2xl text-smoke-200">
          Search the catalog of 23,500+ cigars, add what you carry, and set your price and quantity.
        </p>
      </header>

      {/* Store selector */}
      <StorePicker store={store} onSelect={selectStore} />

      {store && (
        <>
          {/* Summary */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Summary label="SKUs in stock" value={String(totals.skus)} />
            <Summary label="Total units" value={totals.units.toLocaleString()} />
            <Summary label="Inventory value" value={formatUSD(totals.value)} accent />
          </div>

          {/* Catalog search */}
          <div className="mt-8">
            <div className="eyebrow mb-3">Add cigars from the catalog</div>
            <CatalogSearch existing={new Set(items.map((i) => i.cigarId))} onAdd={addCigar} />
          </div>

          {/* Inventory table */}
          <div className="mt-8">
            <div className="eyebrow mb-3">Your inventory</div>
            {items.length === 0 ? (
              <div className="rounded-lg border-[0.5px] border-dashed border-ember-400/20 p-12 text-center text-smoke-400">
                <Package className="mx-auto mb-3 text-ember-400/60" size={28} strokeWidth={1.5} />
                Nothing in stock yet. Search above to add your first cigar.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
                <div className="hidden grid-cols-[1fr_120px_100px_120px_44px] gap-3 border-b-[0.5px] border-ember-400/10 bg-char/60 px-4 py-2.5 text-[10px] uppercase tracking-widest text-smoke-400 sm:grid">
                  <span>Cigar</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Line value</span>
                  <span />
                </div>
                {items.map((it) => (
                  <div
                    key={it.cigarId}
                    className="grid grid-cols-2 items-center gap-3 border-b-[0.5px] border-ember-400/10 bg-char/40 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_120px_100px_120px_44px]"
                  >
                    <div className="col-span-2 min-w-0 sm:col-span-1">
                      <div className="eyebrow truncate">{it.brand}</div>
                      <div className="truncate text-sm font-medium">{it.name}</div>
                      <div className="text-xs text-smoke-400">{it.size}</div>
                    </div>
                    <label className="flex items-center justify-end gap-1">
                      <span className="text-smoke-400 sm:hidden">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.25"
                        value={it.price}
                        onChange={(e) => update(it.cigarId, { price: parseFloat(e.target.value) || 0 })}
                        className="w-20 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-2 py-1.5 text-right text-sm tabular focus:border-ember-400 focus:outline-none"
                      />
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={it.quantity}
                      onChange={(e) => update(it.cigarId, { quantity: parseInt(e.target.value, 10) || 0 })}
                      className="w-16 justify-self-end rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-2 py-1.5 text-right text-sm tabular focus:border-ember-400 focus:outline-none"
                    />
                    <div className="hidden justify-self-end text-sm tabular text-ember-100 sm:block">
                      {formatUSD(it.price * it.quantity)}
                    </div>
                    <button
                      onClick={() => remove(it.cigarId)}
                      aria-label="Remove"
                      className="justify-self-end text-smoke-400 transition hover:text-red-400"
                    >
                      <Trash2 size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-6 text-xs leading-relaxed text-smoke-400">
            Saved to this browser for the demo. In production each change writes to the{' '}
            <code className="text-ember-100">inventory_items</code> table, scoped to your lounge by
            row-level security.
          </p>
        </>
      )}
    </div>
  );
}

function Summary({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4">
      <div className={cn('font-display text-2xl tabular leading-none', accent && 'text-ember-100')}>
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-smoke-400">{label}</div>
    </div>
  );
}

/* ── Store picker ──────────────────────────────────────────────────────────── */
function StorePicker({
  store,
  onSelect,
}: {
  store: CatalogStore | null;
  onSelect: (s: CatalogStore) => void;
}) {
  const [open, setOpen] = useState(!store);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CatalogStore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stores?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setResults(data.items ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  if (store && !open) {
    return (
      <div className="flex items-center justify-between rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 p-4">
        <div className="flex items-center gap-3">
          <Store size={18} strokeWidth={1.5} className="text-ember-400" />
          <div>
            <div className="font-display text-lg font-medium leading-tight">{store.name}</div>
            <div className="text-xs text-smoke-400">
              {store.address ? `${store.address}, ` : ''}{store.city}, {store.state}
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="btn-ghost text-xs">
          Change lounge
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 p-4">
      <div className="eyebrow mb-2">Select your lounge</div>
      <div className="relative">
        <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-smoke-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 713 stores by name, city, or state…"
          className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 py-2.5 pl-9 pr-3 text-sm focus:border-ember-400 focus:outline-none"
        />
      </div>
      <div className="mt-3 space-y-1.5">
        {loading && <div className="px-1 py-2 text-xs text-smoke-400">Searching…</div>}
        {!loading &&
          results.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition hover:bg-ember-400/10"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="text-xs text-smoke-400">
                  {s.city}, {s.state}
                </div>
              </div>
              <Check size={15} strokeWidth={1.5} className="shrink-0 text-ember-400 opacity-0" />
            </button>
          ))}
      </div>
    </div>
  );
}

/* ── Catalog search ────────────────────────────────────────────────────────── */
function CatalogSearch({
  existing,
  onAdd,
}: {
  existing: Set<string>;
  onAdd: (c: CatalogCigar) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CatalogCigar[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cigars?q=${encodeURIComponent(q)}&limit=12`);
        const data = await res.json();
        if (id === reqId.current) {
          setResults(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="relative">
        <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-smoke-400" />
        {loading && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ember-400" />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by brand or name — try “Padron”, “Opus”, “Liga”…"
          className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 py-2.5 pl-9 pr-9 text-sm focus:border-ember-400 focus:outline-none"
        />
      </div>

      {q.trim().length >= 2 && (
        <div className="mt-3 overflow-hidden rounded-lg border-[0.5px] border-ember-400/15">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-6 text-center text-sm text-smoke-400">No matches.</div>
          ) : (
            <>
              {results.map((c) => {
                const added = existing.has(c.uuid);
                return (
                  <div
                    key={c.uuid}
                    className="flex items-center gap-3 border-b-[0.5px] border-ember-400/10 bg-char/40 px-4 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-smoke-400">
                        {c.brand} · {c.size} · {c.country}
                        {c.price != null && <span className="text-smoke-200"> · MSRP {formatUSD(c.price)}</span>}
                      </div>
                    </div>
                    <button
                      disabled={added}
                      onClick={() => onAdd(c)}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition',
                        added
                          ? 'bg-ember-600/30 text-ember-100'
                          : 'bg-ember-400 text-paper hover:bg-ember-600'
                      )}
                    >
                      {added ? <Check size={12} strokeWidth={2} /> : <Plus size={12} strokeWidth={2} />}
                      {added ? 'Added' : 'Add'}
                    </button>
                  </div>
                );
              })}
              {total > results.length && (
                <div className="bg-char/60 px-4 py-2 text-center text-[11px] text-smoke-400">
                  Showing {results.length} of {total.toLocaleString()} matches — refine your search.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
