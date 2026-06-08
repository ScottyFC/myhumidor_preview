'use client';

import { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Loader2, MapPin, Globe } from 'lucide-react';
import { listAdSpots, createAdSpot, setAdActive, deleteAdSpot, type AdSpot, type NewAdSpot } from '@/lib/ads';

export function AdManager() {
  const [spots, setSpots] = useState<AdSpot[] | null>(null);
  const [adding, setAdding] = useState(false);

  async function refresh() { setSpots(await listAdSpots()); }
  useEffect(() => { refresh(); }, []);

  if (spots === null) return <div className="py-8"><Loader2 size={18} className="animate-spin text-ember-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest">
            <Megaphone size={18} strokeWidth={1.5} className="text-ember-400" /> Ad campaigns
          </h2>
          <p className="mt-1 text-xs text-smoke-400">
            Live spots are served to TVs via <code className="text-ember-100">/api/ads</code>. Add a location + radius to geo-target; leave blank for everywhere.
          </p>
        </div>
        <button onClick={() => setAdding((v) => !v)} className="btn-primary text-xs">
          <Plus size={14} strokeWidth={1.5} /> New campaign
        </button>
      </div>

      {adding && <AdForm onDone={async () => { setAdding(false); await refresh(); }} />}

      {spots.length === 0 ? (
        <div className="text-sm text-smoke-400">No campaigns yet. The TV app shows built-in house ads until you add one.</div>
      ) : (
        <div className="space-y-2">
          {spots.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-paper">{s.headline}</span>
                  {s.advertiser && <span className="text-xs text-smoke-400">· {s.advertiser}</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-smoke-400">
                  {s.lat != null && s.lng != null && s.radiusKm != null ? (
                    <span className="inline-flex items-center gap-1"><MapPin size={11} /> {s.lat.toFixed(2)}, {s.lng.toFixed(2)} · {s.radiusKm}km</span>
                  ) : (
                    <span className="inline-flex items-center gap-1"><Globe size={11} /> Global</span>
                  )}
                  {s.qrUrl && <span className="truncate max-w-[220px]">QR → {s.qrUrl}</span>}
                  <span>weight {s.weight}</span>
                </div>
              </div>
              <button
                onClick={async () => { await setAdActive(s.id, !s.active); refresh(); }}
                className={`rounded-md px-2.5 py-1 text-xs ${s.active ? 'bg-ember-400/15 text-ember-100' : 'border-[0.5px] border-ember-400/20 text-smoke-400'}`}
              >
                {s.active ? 'Live' : 'Paused'}
              </button>
              <button onClick={async () => { await deleteAdSpot(s.id); refresh(); }} className="text-smoke-500 hover:text-red-400" title="Delete">
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    advertiser: '', headline: '', subtext: '', qrUrl: '', imageUrl: '',
    lat: '', lng: '', radiusKm: '', startsAt: '', endsAt: '', weight: '1',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  function set<K extends keyof typeof f>(k: K, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function submit() {
    if (!f.headline.trim()) return setErr('A headline is required.');
    setBusy(true); setErr('');
    const num = (s: string) => (s.trim() === '' ? null : Number(s));
    const input: NewAdSpot = {
      advertiser: f.advertiser.trim(), headline: f.headline.trim(), subtext: f.subtext.trim(),
      qrUrl: f.qrUrl.trim(), imageUrl: f.imageUrl.trim(),
      lat: num(f.lat), lng: num(f.lng), radiusKm: num(f.radiusKm),
      startsAt: f.startsAt || null, endsAt: f.endsAt || null, weight: Number(f.weight) || 1,
    };
    const res = await createAdSpot(input);
    setBusy(false);
    if (!res.ok) return setErr(res.error || 'Could not save.');
    onDone();
  }

  return (
    <div className="rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Headline" v={f.headline} on={(v) => set('headline', v)} placeholder="Become a Verified Aficionado" full />
        <Field label="Advertiser (optional)" v={f.advertiser} on={(v) => set('advertiser', v)} placeholder="House / brand name" />
        <Field label="Weight" v={f.weight} on={(v) => set('weight', v)} placeholder="1" />
        <Field label="Subtext" v={f.subtext} on={(v) => set('subtext', v)} placeholder="Scan to upgrade" full />
        <Field label="QR target URL" v={f.qrUrl} on={(v) => set('qrUrl', v)} placeholder="https://…" full />
        <Field label="Banner image URL (optional)" v={f.imageUrl} on={(v) => set('imageUrl', v)} placeholder="https://…" full />
        <Field label="Target lat (optional)" v={f.lat} on={(v) => set('lat', v)} placeholder="27.95" />
        <Field label="Target lng (optional)" v={f.lng} on={(v) => set('lng', v)} placeholder="-82.46" />
        <Field label="Radius km (optional)" v={f.radiusKm} on={(v) => set('radiusKm', v)} placeholder="40" />
        <div />
        <Field label="Starts (optional)" v={f.startsAt} on={(v) => set('startsAt', v)} placeholder="2026-06-10" type="date" />
        <Field label="Ends (optional)" v={f.endsAt} on={(v) => set('endsAt', v)} placeholder="2026-07-10" type="date" />
      </div>
      {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary text-xs">
          {busy ? <Loader2 size={14} className="animate-spin" /> : 'Create campaign'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-smoke-500">Set all three of lat, lng and radius to geo-target; otherwise the spot serves everywhere.</p>
    </div>
  );
}

function Field({
  label, v, on, placeholder, full, type = 'text',
}: { label: string; v: string; on: (v: string) => void; placeholder?: string; full?: boolean; type?: string }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-xs text-smoke-400">{label}</label>
      <input
        type={type} value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder}
        className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
      />
    </div>
  );
}
