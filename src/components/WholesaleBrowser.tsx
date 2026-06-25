'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Boxes, ClipboardList, MessageSquare, Send, Store } from 'lucide-react';
import { browseWholesale, placeOrder, getLoungeOrders, getLoungeThreads, getLoungeMessages, sendLoungeMessage, fmtUsd, type WholesaleBrand, type BrokerOrder } from '@/lib/broker';
import { MessageThread } from '@/components/MessageThread';

export function WholesaleBrowser() {
  const [brands, setBrands] = useState<WholesaleBrand[] | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [orders, setOrders] = useState<BrokerOrder[]>([]);
  const [threads, setThreads] = useState<{ id: string; brands?: { name: string } }[]>([]);
  const [active, setActive] = useState<string | null>(null);

  const reloadOrders = useCallback(async () => setOrders((await getLoungeOrders()).orders ?? []), []);
  const reloadThreads = useCallback(async () => { const r = await getLoungeThreads(); setThreads(r.threads ?? []); if (!active && r.threads?.[0]) setActive(r.threads[0].id); }, [active]);
  useEffect(() => { browseWholesale().then((r) => setBrands(r.brands ?? [])); reloadOrders(); reloadThreads(); }, [reloadOrders, reloadThreads]);

  async function order(b: WholesaleBrand) {
    const items = b.listings.filter((l) => (qty[l.id] ?? 0) > 0).map((l) => ({ listingId: l.id, boxes: qty[l.id] }));
    if (items.length === 0) { setFlash('Set a box quantity first.'); return; }
    const r = await placeOrder(b.brandId, items, note[b.brandId]);
    if (!r.ok) { setFlash(r.error ?? 'Could not place order.'); return; }
    setFlash(`Order placed with ${b.name} — ${fmtUsd(Math.round((r.total ?? 0) * 100))}.`);
    setQty({}); setNote({}); reloadOrders(); reloadThreads();
  }
  async function contact(b: WholesaleBrand) {
    const body = (msg[b.brandId] ?? '').trim(); if (!body) return;
    const r = await sendLoungeMessage({ brandId: b.brandId, body });
    setMsg({ ...msg, [b.brandId]: '' });
    if (r.ok) { reloadThreads(); if (r.threadId) setActive(r.threadId); }
  }

  const input = 'rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 px-2.5 py-1.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';

  return (
    <div className="space-y-10">
      {flash && <div className="rounded-lg border-[0.5px] border-ember-400/30 bg-ember-400/10 px-4 py-2 text-sm text-ember-100">{flash}</div>}

      <section>
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Boxes size={18} className="text-ember-400" /> Order by the box</h2>
        <p className="mt-1 text-sm text-smoke-400">Premier brands offering wholesale. Set box quantities and place an order — the brand reviews and confirms.</p>
        <div className="mt-4 space-y-4">
          {brands === null && <Loader2 className="animate-spin text-ember-400" />}
          {brands && brands.length === 0 && <p className="text-sm text-smoke-400">No premium brands are offering wholesale yet.</p>}
          {brands?.map((b) => (
            <div key={b.brandId} className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
              <div className="flex items-center gap-2 font-display text-lg text-paper"><Store size={15} className="text-ember-400" /> {b.name}</div>
              <div className="mt-2 divide-y divide-ember-400/10">
                {b.listings.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-paper">{l.cigarName}</div>
                      <div className="text-xs text-smoke-400">{[l.vitola, `${l.cigarsPerBox}/box`, `${fmtUsd(l.pricePerBox * 100)}/box`, `MOQ ${l.moqBoxes}`].filter(Boolean).join(' · ')}</div>
                    </div>
                    <input type="number" min={0} placeholder="boxes" value={qty[l.id] ?? ''} onChange={(e) => setQty({ ...qty, [l.id]: parseInt(e.target.value, 10) || 0 })} className={input + ' w-24 shrink-0'} />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input className={input + ' min-w-[180px] flex-1'} placeholder="Note to brand (optional)" value={note[b.brandId] ?? ''} onChange={(e) => setNote({ ...note, [b.brandId]: e.target.value })} />
                <button onClick={() => order(b)} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper">Place order</button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input className={input + ' flex-1'} placeholder={`Message ${b.name}…`} value={msg[b.brandId] ?? ''} onChange={(e) => setMsg({ ...msg, [b.brandId]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') contact(b); }} />
                <button onClick={() => contact(b)} className="flex h-9 w-9 items-center justify-center rounded-lg border-[0.5px] border-ember-400/30 text-ember-100 hover:bg-ember-400/10"><Send size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><ClipboardList size={18} className="text-ember-400" /> Your orders</h2>
        <div className="mt-3 space-y-2">
          {orders.length === 0 && <p className="text-sm text-smoke-400">No orders yet.</p>}
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
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><MessageSquare size={18} className="text-ember-400" /> Messages</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
          <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-2">
            {threads.length === 0 && <p className="p-3 text-sm text-smoke-400">No conversations yet.</p>}
            {threads.map((t) => <button key={t.id} onClick={() => setActive(t.id)} className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${active === t.id ? 'bg-ember-400/15 text-ember-100' : 'text-smoke-300 hover:bg-ember-400/5'}`}>{t.brands?.name ?? 'Brand'}</button>)}
          </div>
          {active
            ? <MessageThread threadId={active} viewer="lounge" load={getLoungeMessages} send={(id, body) => sendLoungeMessage({ threadId: id, body })} />
            : <div className="flex items-center justify-center rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-8 text-sm text-smoke-500">Select a conversation.</div>}
        </div>
      </section>
    </div>
  );
}
