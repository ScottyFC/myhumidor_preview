'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Boxes, ClipboardList, MessageSquare, Send, Store, Plus, Search, ArrowLeft, ChevronRight } from 'lucide-react';
import { browseWholesale, placeOrder, getLoungeOrders, getLoungeThreads, getLoungeMessages, sendLoungeMessage, fmtUsd, type WholesaleBrand, type BrokerOrder } from '@/lib/broker';
import { MessageThread } from '@/components/MessageThread';

type View = 'new' | 'orders' | 'messages';

export function WholesaleBrowser() {
  const [brands, setBrands] = useState<WholesaleBrand[] | null>(null);
  const [view, setView] = useState<View>('new');
  const [selected, setSelected] = useState<WholesaleBrand | null>(null);
  const [brandQuery, setBrandQuery] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [convo, setConvo] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<BrokerOrder[]>([]);
  const [threads, setThreads] = useState<{ id: string; brands?: { name: string } }[]>([]);
  const [active, setActive] = useState<string | null>(null);

  const reloadOrders = useCallback(async () => setOrders((await getLoungeOrders()).orders ?? []), []);
  const reloadThreads = useCallback(async () => { const r = await getLoungeThreads(); setThreads(r.threads ?? []); }, []);
  const reloadBrands = useCallback(async () => { const r = await browseWholesale(); setBrands(r.brands ?? []); return r.brands ?? []; }, []);
  useEffect(() => { reloadBrands(); reloadOrders(); reloadThreads(); }, [reloadBrands, reloadOrders, reloadThreads]);

  const filtered = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    const list = brands ?? [];
    return q ? list.filter((b) => b.name.toLowerCase().includes(q)) : list;
  }, [brands, brandQuery]);

  function pick(b: WholesaleBrand) { setSelected(b); setQty({}); setNote(''); setConvo(''); setFlash(null); }
  function backToBrands() { setSelected(null); setQty({}); setNote(''); }

  async function submitOrder() {
    if (!selected) return;
    const items = selected.listings.filter((l) => (qty[l.id] ?? 0) > 0).map((l) => ({ listingId: l.id, boxes: qty[l.id] }));
    if (items.length === 0) { setFlash('Enter a box quantity for at least one cigar.'); return; }
    setBusy(true);
    const r = await placeOrder(selected.brandId, items, note);
    setBusy(false);
    if (!r.ok) { setFlash(r.error ?? 'Could not place order.'); return; }
    setFlash(`Order placed with ${selected.name} — ${fmtUsd(Math.round((r.total ?? 0) * 100))}.`);
    setSelected(null); setQty({}); setNote('');
    await Promise.all([reloadOrders(), reloadThreads(), reloadBrands()]);
    setView('orders');
  }

  async function messageBrand() {
    if (!selected) return;
    const body = convo.trim(); if (!body) return;
    const r = await sendLoungeMessage({ brandId: selected.brandId, body });
    setConvo('');
    if (r.ok) { await reloadThreads(); if (r.threadId) setActive(r.threadId); setView('messages'); }
  }

  const input = 'rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  const tabs: { id: View; label: string; icon: typeof Boxes; count?: number }[] = [
    { id: 'new', label: 'New order', icon: Plus },
    { id: 'orders', label: 'Your orders', icon: ClipboardList, count: orders.length },
    { id: 'messages', label: 'Messages', icon: MessageSquare, count: threads.length },
  ];

  return (
    <div>
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Boxes size={18} className="text-ember-400" /> Wholesale</h2>
      <p className="mt-1 text-sm text-smoke-400">Order cigars by the box from Premier brands and message them directly.</p>

      <div className="mt-4 flex flex-wrap gap-1.5 border-b-[0.5px] border-ember-400/15 pb-3">
        {tabs.map((t) => {
          const Icon = t.icon; const on = view === t.id;
          return (
            <button key={t.id} onClick={() => { setView(t.id); if (t.id !== 'new') setSelected(null); }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${on ? 'bg-ember-400/15 text-ember-100' : 'text-smoke-300 hover:bg-ember-400/5 hover:text-paper'}`}>
              <Icon size={15} strokeWidth={1.5} /> {t.label}
              {t.count ? <span className="ml-0.5 rounded-full bg-ember-400/20 px-1.5 text-[10px] font-medium text-ember-200">{t.count}</span> : null}
            </button>
          );
        })}
      </div>

      {flash && <div className="mt-4 rounded-lg border-[0.5px] border-ember-400/30 bg-ember-400/10 px-4 py-2 text-sm text-ember-100">{flash}</div>}

      {/* ─── NEW ORDER ─── */}
      {view === 'new' && (
        <div className="mt-4">
          {brands === null ? (
            <Loader2 className="animate-spin text-ember-400" />
          ) : !selected ? (
            <>
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-smoke-400" />
                <input autoFocus={false} value={brandQuery} onChange={(e) => setBrandQuery(e.target.value)} placeholder="Search brands offering wholesale…" className={input + ' w-full pl-9'} />
              </label>
              <div className="mt-3 overflow-hidden rounded-xl border-[0.5px] border-ember-400/15">
                {filtered.length === 0 && <p className="p-4 text-sm text-smoke-400">{brands.length === 0 ? 'No Premier brands are offering wholesale yet.' : 'No brands match that search.'}</p>}
                {filtered.map((b) => (
                  <button key={b.brandId} onClick={() => pick(b)} className="flex w-full items-center justify-between gap-3 border-b-[0.5px] border-ember-400/10 bg-char/30 px-4 py-3 text-left transition last:border-b-0 hover:bg-ember-400/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Store size={16} className="shrink-0 text-ember-400" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-paper">{b.name}</div>
                        <div className="text-xs text-smoke-400">{b.listings.length} cigar{b.listings.length === 1 ? '' : 's'} available</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-smoke-400" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/30 p-4">
              <button onClick={backToBrands} className="inline-flex items-center gap-1.5 text-sm text-smoke-300 hover:text-paper"><ArrowLeft size={14} /> Choose a different brand</button>
              <div className="mt-3 flex items-center gap-2 font-display text-xl text-paper"><Store size={16} className="text-ember-400" /> {selected.name}</div>
              <p className="mt-0.5 text-xs text-smoke-400">Set the number of boxes for each cigar, then submit. {selected.name} reviews and confirms your order.</p>

              <div className="mt-3 divide-y divide-ember-400/10">
                {selected.listings.map((l) => {
                  const soldOut = l.boxesAvailable !== null && l.boxesAvailable <= 0;
                  const capped = l.boxesAvailable !== null && l.boxesAvailable > 0;
                  return (
                    <div key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        {l.imageUrl
                          /* eslint-disable-next-line @next/next/no-img-element */
                          ? <img src={l.imageUrl} alt="" className="h-11 w-9 shrink-0 rounded object-contain" />
                          : <div className="flex h-11 w-9 shrink-0 items-center justify-center rounded bg-char/60 text-smoke-500"><Boxes size={13} /></div>}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-paper">{l.cigarName} {soldOut && <span className="ml-1 text-[11px] uppercase tracking-wide text-red-300">out of stock</span>}</div>
                          <div className="text-xs text-smoke-400">{[l.vitola, `${l.cigarsPerBox}/box`, `${fmtUsd(l.pricePerBox * 100)}/box`, `MOQ ${l.moqBoxes}`, capped ? `${l.boxesAvailable} available` : 'available'].filter(Boolean).join(' · ')}</div>
                        </div>
                      </div>
                      <input type="number" min={0} max={capped ? l.boxesAvailable! : undefined} disabled={soldOut} placeholder="boxes" value={qty[l.id] ?? ''} onChange={(e) => { const v = parseInt(e.target.value, 10) || 0; setQty({ ...qty, [l.id]: capped ? Math.min(l.boxesAvailable!, v) : v }); }} className={input + ' w-24 shrink-0 disabled:opacity-40'} />
                    </div>
                  );
                })}
              </div>

              <input className={input + ' mt-3 w-full'} placeholder="Note to brand (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button onClick={submitOrder} disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50 sm:w-auto">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Boxes size={15} />} Submit order
              </button>

              <div className="mt-4 flex items-center gap-2 border-t-[0.5px] border-ember-400/10 pt-3">
                <input className={input + ' flex-1'} placeholder={`Question for ${selected.name}? Message them…`} value={convo} onChange={(e) => setConvo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') messageBrand(); }} />
                <button onClick={messageBrand} className="flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] border-ember-400/30 text-ember-100 hover:bg-ember-400/10"><Send size={15} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── YOUR ORDERS ─── */}
      {view === 'orders' && (
        <div className="mt-4 space-y-2">
          {orders.length === 0 && (
            <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-6 text-center">
              <ClipboardList size={20} className="mx-auto text-ember-400" />
              <p className="mt-2 text-sm text-smoke-300">No orders yet.</p>
              <button onClick={() => setView('new')} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper"><Plus size={14} /> Place your first order</button>
            </div>
          )}
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
              <div className="min-w-0">
                <div className="font-medium text-paper">{o.brands?.name ?? 'Brand'}</div>
                <div className="text-xs text-smoke-400">{o.broker_order_items?.map((i) => `${i.boxes}× ${i.cigar_name}`).join(', ')}</div>
              </div>
              <div className="text-right"><div className="font-display tabular text-ember-100">{fmtUsd(o.total_cents)}</div><div className="text-[11px] uppercase tracking-wide text-smoke-400">{o.status}</div></div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MESSAGES ─── */}
      {view === 'messages' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr]">
          <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-2">
            {threads.length === 0 && <p className="p-3 text-sm text-smoke-400">No conversations yet. Start one from a brand in “New order”.</p>}
            {threads.map((t) => <button key={t.id} onClick={() => setActive(t.id)} className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${active === t.id ? 'bg-ember-400/15 text-ember-100' : 'text-smoke-300 hover:bg-ember-400/5'}`}>{t.brands?.name ?? 'Brand'}</button>)}
          </div>
          {active
            ? <MessageThread threadId={active} viewer="lounge" load={getLoungeMessages} send={(id, body) => sendLoungeMessage({ threadId: id, body })} />
            : <div className="flex items-center justify-center rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-8 text-sm text-smoke-500">Select a conversation.</div>}
        </div>
      )}
    </div>
  );
}
