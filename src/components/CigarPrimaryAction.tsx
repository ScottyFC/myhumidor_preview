'use client';

import { useEffect, useState } from 'react';
import { Store, Loader2, Check, X } from 'lucide-react';
import { AddToCollection } from '@/components/AddToCollection';
import { subscribeAuth, type Session } from '@/lib/auth';
import { getMyCertifiedLounge } from '@/lib/lounges-owner';
import { addOneToInventory } from '@/lib/inventory';

interface Seed { cigarId: string; slug: string; brand: string; name: string; size?: string; price?: number | null }

/**
 * Primary action on a cigar page. Certified-lounge owners (in retailer mode)
 * see "Add to My Inventory" with a mini price/quantity manager that can publish
 * straight to their shop; everyone else sees the normal "Add to My Humidor".
 */
export function CigarPrimaryAction({ seed }: { seed: Seed }) {
  const [session, setSession] = useState<Session | null>(null);
  const [lounge, setLounge] = useState<{ slug: string; name: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeAuth(setSession), []);
  useEffect(() => {
    if (session?.type === 'retailer') getMyCertifiedLounge().then(setLounge);
    else setLounge(null);
  }, [session]);

  if (!lounge) return <AddToCollection variant="full" seed={{ cigarId: seed.cigarId, slug: seed.slug, brand: seed.brand, name: seed.name, size: seed.size ?? '' }} />;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg bg-ember-400 px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ember-600"
      >
        <Store size={15} strokeWidth={1.75} /> Add to My Inventory
      </button>
      {open && <InventoryMini seed={seed} loungeSlug={lounge.slug} loungeName={lounge.name} onClose={() => setOpen(false)} />}
    </div>
  );
}

function InventoryMini({ seed, loungeSlug, loungeName, onClose }: { seed: Seed; loungeSlug: string; loungeName: string; onClose: () => void }) {
  const [price, setPrice] = useState(seed.price != null ? String(seed.price) : '');
  const [qty, setQty] = useState('1');
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setBusy(true); setErr('');
    const ok = await addOneToInventory(loungeSlug, {
      cigarId: seed.cigarId, slug: seed.slug, brand: seed.brand, name: seed.name, size: seed.size,
      price: price.trim() ? Number(price) : null, quantity: Math.max(1, parseInt(qty, 10) || 1),
    }, publish);
    setBusy(false);
    if (ok) { setDone(true); setTimeout(onClose, 1200); } else setErr('Could not save. Try again.');
  }

  return (
    <div className="mt-3 w-full max-w-sm rounded-xl border-[0.5px] border-ember-400/25 bg-char/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-paper">Add to {loungeName}</div>
        <button onClick={onClose} aria-label="Close" className="text-smoke-400 hover:text-paper"><X size={15} /></button>
      </div>
      {done ? (
        <div className="flex items-center gap-2 py-2 text-sm text-ember-100"><Check size={14} strokeWidth={2} /> Added{publish ? ' and published' : ''}.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="eyebrow mb-1 block">Price (USD)</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="12.50"
                className="w-full rounded-lg border-[0.5px] border-ember-400/20 bg-ink/60 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none" />
            </label>
            <label className="block">
              <span className="eyebrow mb-1 block">Quantity</span>
              <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" placeholder="1"
                className="w-full rounded-lg border-[0.5px] border-ember-400/20 bg-ink/60 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none" />
            </label>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-smoke-200">
            <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="accent-ember-400" />
            Publish to my shop page now
          </label>
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
          <button onClick={save} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600 disabled:opacity-50">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Store size={13} />} Save to inventory
          </button>
        </>
      )}
    </div>
  );
}
