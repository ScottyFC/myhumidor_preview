'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Boxes, Plus, Trash2, Pause, Play } from 'lucide-react';
import { getBrandListings, createBrandListing, updateBrandListing, deleteBrandListing, fmtUsd, type WholesaleListing } from '@/lib/broker';

export function BrandWholesale() {
  const [rows, setRows] = useState<WholesaleListing[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ cigarName: '', vitola: '', cigarsPerBox: '20', pricePerBox: '', boxesAvailable: '0', moqBoxes: '1' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => setRows((await getBrandListings()).listings ?? []), []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setErr(null);
    if (!f.cigarName.trim()) return setErr('Cigar name required.');
    if (!(Number(f.pricePerBox) > 0)) return setErr('Enter a price per box.');
    setBusy(true);
    const r = await createBrandListing(f); setBusy(false);
    if (!r.ok) return setErr(r.error ?? 'Could not create.');
    setF({ cigarName: '', vitola: '', cigarsPerBox: '20', pricePerBox: '', boxesAvailable: '0', moqBoxes: '1' }); setAdding(false); load();
  }
  async function toggle(l: WholesaleListing) { await updateBrandListing(l.id, { status: l.status === 'active' ? 'paused' : 'active' }); load(); }
  async function remove(id: string) { await deleteBrandListing(id); load(); }

  const input = 'rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-2.5 py-1.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none';
  return (
    <section id="wholesale" className="mt-8 scroll-mt-24">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Boxes size={18} className="text-ember-400" /> Wholesale (by the box)</h2>
        {!adding && <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-3 py-1.5 text-xs font-medium text-paper"><Plus size={13} /> Add listing</button>}
      </div>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        <p className="text-xs text-smoke-400">List cigars for lounges to order by the box. Lounges browse these in the wholesale catalog and place orders you approve here.</p>
        {adding && (
          <div className="mt-3 grid gap-2 rounded-lg border-[0.5px] border-ember-400/20 bg-char/40 p-3 sm:grid-cols-2">
            <input className={input} placeholder="Cigar name" value={f.cigarName} onChange={(e) => setF({ ...f, cigarName: e.target.value })} />
            <input className={input} placeholder="Vitola (e.g. Toro 6x52)" value={f.vitola} onChange={(e) => setF({ ...f, vitola: e.target.value })} />
            <label className="flex items-center gap-2 text-xs text-smoke-400">Cigars/box <input className={input + ' w-20'} inputMode="numeric" value={f.cigarsPerBox} onChange={(e) => setF({ ...f, cigarsPerBox: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-xs text-smoke-400">Price/box ($) <input className={input + ' w-24'} inputMode="decimal" value={f.pricePerBox} onChange={(e) => setF({ ...f, pricePerBox: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-xs text-smoke-400">Boxes available <input className={input + ' w-20'} inputMode="numeric" value={f.boxesAvailable} onChange={(e) => setF({ ...f, boxesAvailable: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-xs text-smoke-400">Min order (boxes) <input className={input + ' w-20'} inputMode="numeric" value={f.moqBoxes} onChange={(e) => setF({ ...f, moqBoxes: e.target.value })} /></label>
            {err && <p className="text-sm text-red-300 sm:col-span-2">{err}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <button onClick={create} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create</button>
              <button onClick={() => { setAdding(false); setErr(null); }} className="text-xs text-smoke-400 hover:text-paper">Cancel</button>
            </div>
          </div>
        )}
        <div className="mt-3 divide-y divide-ember-400/10">
          {rows === null && <Loader2 className="animate-spin text-ember-400" />}
          {rows && rows.length === 0 && !adding && <p className="py-2 text-sm text-smoke-400">No wholesale listings yet.</p>}
          {rows?.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="font-medium text-paper">{l.cigar_name} {l.status === 'paused' && <span className="ml-1 text-[11px] uppercase tracking-wide text-smoke-500">paused</span>}</div>
                <div className="text-xs text-smoke-400">{[l.vitola, `${l.cigars_per_box}/box`, `${fmtUsd(l.price_per_box_cents)}/box`, `MOQ ${l.moq_boxes}`, `${l.boxes_available} avail`].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(l)} className="text-smoke-400 hover:text-ember-100" aria-label="Toggle">{l.status === 'active' ? <Pause size={15} /> : <Play size={15} />}</button>
                <button onClick={() => remove(l.id)} className="text-smoke-400 hover:text-red-300" aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
