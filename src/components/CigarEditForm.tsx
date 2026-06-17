'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Loader2, Check, X } from 'lucide-react';
import { subscribeAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { supabaseBrowser } from '@/lib/supabase';

interface Current {
  brand: string; name: string; country?: string; price?: number | null; buyUrl?: string | null;
}

/** Admin-only inline editor for a cigar's details + purchase link. */
export function CigarEditForm({ slug, current }: { slug: string; current: Current }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  const [brand, setBrand] = useState(current.brand ?? '');
  const [name, setName] = useState(current.name ?? '');
  const [country, setCountry] = useState(current.country ?? '');
  const [price, setPrice] = useState(current.price != null ? String(current.price) : '');
  const [buyUrl, setBuyUrl] = useState(current.buyUrl ?? '');

  useEffect(() => subscribeAuth((s) => setAdmin(isAdmin(s?.publicId))), []);
  if (!admin) return null;

  async function save() {
    setBusy(true); setErr(''); setSaved(false);
    try {
      if (buyUrl.trim() && !/^https?:\/\//i.test(buyUrl.trim())) throw new Error('Buy link must start with http(s)://');
      const { error } = await supabaseBrowser().rpc('set_catalog_override', {
        p_slug: slug,
        p_brand: brand.trim() || null,
        p_name: name.trim() || null,
        p_country: country.trim() || null,
        p_price: price.trim() ? Number(price) : null,
        p_buy_url: buyUrl.trim() || null,
        p_removed: false,
      });
      if (error) throw new Error(error.message);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 py-1.5 text-xs font-medium text-ember-100 hover:bg-ember-400/10">
        <Pencil size={13} strokeWidth={1.5} /> Edit details
      </button>
    );
  }

  const field = 'w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-1.5 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none';

  return (
    <div className="mt-3 rounded-lg border-[0.5px] border-ember-400/30 bg-char/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow">Admin · edit cigar</span>
        <button onClick={() => setOpen(false)} className="text-smoke-400 hover:text-paper"><X size={15} /></button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] text-smoke-400">Brand<input value={brand} onChange={(e) => setBrand(e.target.value)} className={field} /></label>
        <label className="text-[11px] text-smoke-400">Name<input value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
        <label className="text-[11px] text-smoke-400">Origin<input value={country} onChange={(e) => setCountry(e.target.value)} className={field} /></label>
        <label className="text-[11px] text-smoke-400">MSRP<input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="e.g. 12.50" className={field} /></label>
        <label className="text-[11px] text-smoke-400 sm:col-span-2">Purchase link (from the brand)
          <input value={buyUrl} onChange={(e) => setBuyUrl(e.target.value)} placeholder="https://brand.com/product" className={field} />
        </label>
      </div>
      {err && <p className="mt-2 text-[11px] text-red-400">{err}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-3 py-1.5 text-xs font-medium text-paper hover:bg-ember-600 disabled:opacity-60">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2} />} Save
        </button>
        {saved && !busy && <span className="text-[11px] text-ember-100">Saved.</span>}
        <span className="text-[10px] text-smoke-500">Image is set with the controls under the photo.</span>
      </div>
    </div>
  );
}
