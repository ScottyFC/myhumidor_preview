'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, ClipboardList } from 'lucide-react';
import { getBrandOrders, setBrandOrderStatus, fmtUsd, type BrokerOrder } from '@/lib/broker';

const NEXT: Record<string, { label: string; status: string }[]> = {
  placed: [{ label: 'Accept', status: 'accepted' }, { label: 'Decline', status: 'declined' }],
  accepted: [{ label: 'Mark shipped', status: 'shipped' }],
};
const TONE: Record<string, string> = { placed: 'text-ember-300', accepted: 'text-emerald-300', shipped: 'text-sky-300', declined: 'text-smoke-400', cancelled: 'text-smoke-400' };

export function BrandOrders() {
  const [orders, setOrders] = useState<BrokerOrder[] | null>(null);
  const load = useCallback(async () => setOrders((await getBrandOrders()).orders ?? []), []);
  useEffect(() => { load(); }, [load]);
  async function act(id: string, status: string) { await setBrandOrderStatus(id, status); load(); }

  return (
    <section id="orders" className="mt-8 scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><ClipboardList size={18} className="text-ember-400" /> Wholesale orders</h2>
      <div className="mt-3 space-y-3">
        {orders === null && <Loader2 className="animate-spin text-ember-400" />}
        {orders && orders.length === 0 && <p className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4 text-sm text-smoke-400">No orders yet.</p>}
        {orders?.map((o) => (
          <div key={o.id} className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-paper">{o.lounges?.name ?? 'Lounge'}</div>
                <div className="text-xs text-smoke-400">{[o.lounges?.city, o.lounges?.state].filter(Boolean).join(', ')} · {new Date(o.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg tabular text-ember-100">{fmtUsd(o.total_cents)}</div>
                <div className={`text-[11px] uppercase tracking-wide ${TONE[o.status] ?? 'text-smoke-400'}`}>{o.status}</div>
              </div>
            </div>
            <ul className="mt-2 space-y-0.5 text-sm text-smoke-300">
              {o.broker_order_items?.map((it, i) => <li key={i}>{it.boxes} × {it.cigar_name} <span className="text-smoke-500">({fmtUsd(it.price_per_box_cents)}/box)</span></li>)}
            </ul>
            {o.note && <p className="mt-1 text-xs italic text-smoke-400">“{o.note}”</p>}
            {NEXT[o.status] && (
              <div className="mt-3 flex gap-2">
                {NEXT[o.status].map((a) => <button key={a.status} onClick={() => act(o.id, a.status)} className="rounded-lg border-[0.5px] border-ember-400/30 px-3 py-1.5 text-xs text-ember-100 hover:bg-ember-400/10">{a.label}</button>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
