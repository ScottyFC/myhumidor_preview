'use client';

import { searchCatalogCigarsRemote } from '@/lib/db';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Plus, Trash2, Store, Check, Lock, Package, Loader2,
  UploadCloud, Download, Rocket,
} from 'lucide-react';
import type { CatalogCigar, CatalogStore, InventoryItem } from '@/types';
import { cn, formatUSD } from '@/lib/utils';
import { getInventory, saveInventory, publishMenu } from '@/lib/inventory';
import { LoungeLogoEditor } from '@/components/LoungeLogoEditor';
import { ActivityLog } from '@/components/ActivityLog';
import { PostComposer } from '@/components/PostComposer';
import { BoostLounge } from '@/components/BoostLounge';
import { SocialLinksEditor } from '@/components/SocialLinks';
import { getMyLounges, type MyLounge } from '@/lib/lounges-owner';

const STORE_KEY = 'myhumidor:active-store';

const TEMPLATE_CSV = `brand,name,size,price,quantity
Padron,1964 Anniversary Series Exclusivo Maduro,Robusto,17.50,12
Arturo Fuente,Hemingway Short Story,Perfecto,9.25,20
Oliva,Serie V Melanio,Toro,13.00,8
`;

export default function InventoryPage() {
  const [store, setStore] = useState<CatalogStore | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [published, setPublished] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  // Load active store + its inventory on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE_KEY);
      if (s) {
        const parsed: CatalogStore = JSON.parse(s);
        setStore(parsed);
        getInventory(parsed.slug, parsed.id).then((inv) => setItems(inv));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // Persist inventory whenever it changes (debounced so price edits don't spam)
  useEffect(() => {
    if (!hydrated || !store) return;
    setPublished(false); // edits make the published menu stale until re-published
    const t = setTimeout(() => {
      void saveInventory(store.slug, items, store.id);
    }, 700);
    return () => clearTimeout(t);
  }, [items, store, hydrated]);

  function selectStore(s: CatalogStore) {
    setStore(s);
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
    setItems([]);
    getInventory(s.slug, s.id).then((inv) => setItems(inv));
  }

  function addCigar(c: CatalogCigar) {
    setItems((prev) => {
      if (prev.some((i) => i.cigarId === c.uuid)) return prev; // already in
      return [
        {
          cigarId: c.uuid,
          slug: c.slug,
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

  async function publish() {
    if (!store) return;
    const ok = await publishMenu(store.slug, items, store.id);
    if (ok) setPublished(true);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'myhumidor-menu-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    setImportMsg('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setImportMsg('That file looks empty.');
        return;
      }
      const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const col = (n: string) => header.indexOf(n);
      const ci = { brand: col('brand'), name: col('name'), size: col('size'), price: col('price'), qty: col('quantity') };
      if (ci.brand < 0 || ci.name < 0) {
        setImportMsg('Missing required columns. Use the template (brand, name, size, price, quantity).');
        return;
      }
      const parsed: InventoryItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',');
        const name = (cells[ci.name] ?? '').trim();
        if (!name) continue;
        parsed.push({
          cigarId: `csv_${i}_${Date.now()}`,
          brand: (cells[ci.brand] ?? '').trim(),
          name,
          size: ci.size >= 0 ? (cells[ci.size] ?? '').trim() : '',
          price: ci.price >= 0 ? parseFloat((cells[ci.price] ?? '').replace(/[$,]/g, '')) || 0 : 0,
          quantity: ci.qty >= 0 ? parseInt((cells[ci.qty] ?? '').trim(), 10) || 0 : 0,
        });
      }
      setItems((prev) => [...parsed, ...prev]);
      setImportMsg(`Imported ${parsed.length} item${parsed.length === 1 ? '' : 's'}. Review prices, then publish.`);
    };
    reader.readAsText(file);
    e.target.value = '';
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

          {/* Bulk upload */}
          <div className="mt-8 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 p-5">
            <div className="eyebrow mb-1">Upload a menu (.csv)</div>
            <p className="mb-3 text-xs text-smoke-400">
              Got a big menu? Upload it all at once. Download the template, fill it in, and import.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={downloadTemplate} className="btn-ghost text-sm">
                <Download size={14} strokeWidth={1.5} /> Download template
              </button>
              <label className="btn-primary cursor-pointer text-sm">
                <UploadCloud size={14} strokeWidth={1.5} /> Upload CSV
                <input type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" />
              </label>
            </div>
            {importMsg && <div className="mt-2 text-xs text-ember-100">{importMsg}</div>}
          </div>

          {/* Inventory table */}
          <div className="mt-8">
            <div className="eyebrow mb-3">Your inventory</div>
            {items.length === 0 ? (
              <div className="rounded-lg border-[0.5px] border-dashed border-ember-400/20 p-12 text-center text-smoke-400">
                <Package className="mx-auto mb-3 text-ember-400/60" size={28} strokeWidth={1.5} />
                Nothing in stock yet. Search or upload a CSV to add your first cigars.
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
                    <div className="col-span-2 mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-[0.5px] border-ember-400/10 pt-2 text-xs text-smoke-300 sm:col-span-5">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" checked={!!it.comingSoon} onChange={(e) => update(it.cigarId, { comingSoon: e.target.checked })} className="accent-ember-400" />
                        Coming soon
                      </label>
                      {it.comingSoon && (
                        <>
                          <label className="flex items-center gap-1.5">Release
                            <input type="date" value={it.releaseDate ?? ''} onChange={(e) => update(it.cigarId, { releaseDate: e.target.value })} className="rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-2 py-1 text-paper focus:border-ember-400 focus:outline-none" />
                          </label>
                          <label className="flex cursor-pointer items-center gap-1.5">
                            <input type="checkbox" checked={!!it.preorderEnabled} onChange={(e) => update(it.cigarId, { preorderEnabled: e.target.checked })} className="accent-ember-400" />
                            Open pre-orders (Aficionado)
                          </label>
                          {it.preorderEnabled && (
                            <label className="flex items-center gap-1.5">Limit
                              <input type="number" min={0} value={it.preorderLimit ?? 0} onChange={(e) => update(it.cigarId, { preorderLimit: parseInt(e.target.value, 10) || 0 })} className="w-16 rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-2 py-1 text-right tabular text-paper focus:border-ember-400 focus:outline-none" />
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publish */}
          {items.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border-[0.5px] border-ember-400/30 bg-ember-400/5 p-5">
              <div>
                <div className="font-display text-lg">
                  {published ? 'Your menu is live' : 'Ready to go live?'}
                </div>
                <div className="text-sm text-smoke-300">
                  {published
                    ? `Published ${totals.skus} cigars to your lounge page.`
                    : 'Publish this inventory to your public lounge page so members can see what you carry.'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {store && published && (
                  <Link href={`/lounges/${store.slug}`} className="btn-ghost text-sm">
                    View lounge page
                  </Link>
                )}
                <button
                  onClick={publish}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition',
                    published ? 'bg-ember-600/30 text-ember-100' : 'bg-ember-400 text-paper hover:bg-ember-600'
                  )}
                >
                  {published ? <Check size={15} strokeWidth={2} /> : <Rocket size={15} strokeWidth={1.5} />}
                  {published ? 'Published' : 'Confirm & publish to lounge page'}
                </button>
              </div>
            </div>
          )}

          {store && (
            <PostComposer slug={store.slug} loungeName={store.name} />
          )}

          {store && (
            <BoostLounge slug={store.slug} />
          )}

          {store && (
            <div className="mt-8">
              <SocialLinksEditor kind="lounge" owner={store.slug} />
            </div>
          )}

          {store && (
            <div className="mt-8">
              <div className="eyebrow mb-3">Recent activity</div>
              <ActivityLog slug={store.slug} />
            </div>
          )}

          <p className="mt-6 text-xs leading-relaxed text-smoke-400">
            Inventory and the published menu are saved to the{' '}
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
function MyLoungesPicker({ onSelect }: { onSelect: (s: CatalogStore) => void }) {
  const [mine, setMine] = useState<MyLounge[]>([]);
  useEffect(() => {
    getMyLounges().then(setMine);
  }, []);
  if (mine.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="eyebrow mb-2">Lounges you manage</div>
      <div className="space-y-1.5">
        {mine.map((l) => (
          <button
            key={l.loungeId}
            onClick={() => onSelect({ id: l.loungeId, slug: l.slug, name: l.name, city: l.city, state: l.state } as CatalogStore)}
            className="flex w-full items-center justify-between rounded-md border-[0.5px] border-ember-400/15 px-3 py-2 text-left transition hover:bg-ember-400/10"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{l.name}</div>
              <div className="truncate text-xs text-smoke-400">{[l.city, l.state].filter(Boolean).join(', ')}</div>
            </div>
            <span className="shrink-0 rounded-full bg-ember-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ember-100">{l.role}</span>
          </button>
        ))}
      </div>
      <div className="my-4 h-px bg-ember-400/10" />
    </div>
  );
}

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
            <LoungeLogoEditor slug={store.slug} force />
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
      <MyLoungesPicker onSelect={(s) => { onSelect(s); setOpen(false); }} />
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
        const [staticRes, dbCigars] = await Promise.all([
          fetch(`/api/cigars?q=${encodeURIComponent(q)}&limit=12`).then((r) => r.json()),
          searchCatalogCigarsRemote(q, 8),
        ]);
        if (id !== reqId.current) return;
        const staticItems: CatalogCigar[] = staticRes.items ?? [];
        const key = (x: CatalogCigar) => `${x.brand}|${x.name}`.toLowerCase().replace(/\s+/g, ' ').trim();
        const seen = new Set<string>();
        const merged = [...staticItems, ...dbCigars].filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
        setResults(merged.slice(0, 12));
        setTotal(Math.max(staticRes.total ?? 0, merged.length));
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
