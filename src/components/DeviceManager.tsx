'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tv, Monitor, Plus, Trash2, Loader2, Wifi, WifiOff, ExternalLink } from 'lucide-react';
import { getMyLounges, type MyLounge } from '@/lib/lounges-owner';
import {
  listDevices, addDevice, removeDevice, todayCreditsByDevice,
  type LoungeDevice, CREDITS_PER_HOUR, DAILY_CAP_PER_TV,
} from '@/lib/devices';

function lastSeenLabel(iso: string | null): { online: boolean; text: string } {
  if (!iso) return { online: false, text: 'never streamed' };
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (mins < 5) return { online: true, text: 'streaming now' };
  if (mins < 60) return { online: false, text: `${Math.floor(mins)}m ago` };
  if (mins < 1440) return { online: false, text: `${Math.floor(mins / 60)}h ago` };
  return { online: false, text: `${Math.floor(mins / 1440)}d ago` };
}

export function DeviceManager() {
  const [lounge, setLounge] = useState<MyLounge | null>(null);
  const [devices, setDevices] = useState<LoungeDevice[]>([]);
  const [credits, setCredits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'tv' | 'menu'>('tv');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function refresh(loungeId: string) {
    const [d, c] = await Promise.all([listDevices(loungeId), todayCreditsByDevice(loungeId)]);
    setDevices(d); setCredits(c);
  }

  useEffect(() => {
    let off = false;
    getMyLounges().then(async (ls) => {
      if (off) return;
      const l = ls[0] ?? null;
      setLounge(l);
      if (l) await refresh(l.loungeId);
      setLoading(false);
    });
    return () => { off = true; };
  }, []);

  async function submit() {
    if (!lounge) return;
    setBusy(true); setErr('');
    const res = await addDevice(lounge.loungeId, name.trim() || (kind === 'tv' ? 'New TV' : 'Menu screen'), kind);
    setBusy(false);
    if (!res.ok) { setErr(res.error || 'Could not add screen.'); return; }
    setName(''); setAdding(false);
    await refresh(lounge.loungeId);
  }

  async function remove(id: string) {
    if (!lounge) return;
    await removeDevice(id);
    await refresh(lounge.loungeId);
  }

  if (loading) {
    return <div className="py-8"><Loader2 size={18} className="animate-spin text-ember-400" /></div>;
  }
  if (!lounge) {
    return (
      <div className="rounded-xl border-[0.5px] border-ember-400/20 bg-char/40 p-6 text-sm text-smoke-300">
        Verify your lounge to register screens and start earning credits.
        <Link href="/verify" className="ml-1 text-ember-100 underline">Verify now</Link>.
      </div>
    );
  }

  const tvs = devices.filter((d) => d.kind === 'tv');
  const menus = devices.filter((d) => d.kind === 'menu');

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-tightest">Screens &amp; credits</h2>
          <p className="mt-1 text-xs text-smoke-400">
            Each TV streaming CigarTV earns {CREDITS_PER_HOUR} credits/hour (up to {DAILY_CAP_PER_TV}/day). Add a screen for every TV in your lounge.
          </p>
        </div>
        <button onClick={() => setAdding((v) => !v)} className="btn-primary text-xs">
          <Plus size={14} strokeWidth={1.5} /> Add screen
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1 block text-xs text-smoke-400">Name</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder={kind === 'tv' ? 'Patio TV' : 'Bar menu'}
                className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-smoke-400">Type</label>
              <div className="flex gap-1.5">
                <Toggle on={kind === 'tv'} onClick={() => setKind('tv')} icon={<Tv size={14} strokeWidth={1.5} />} label="Streaming TV" />
                <Toggle on={kind === 'menu'} onClick={() => setKind('menu')} icon={<Monitor size={14} strokeWidth={1.5} />} label="Digital menu" />
              </div>
            </div>
            <button onClick={submit} disabled={busy} className="btn-primary text-xs">
              {busy ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
            </button>
          </div>
          {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
          <p className="mt-2 text-[11px] text-smoke-500">
            On the TV: open the CigarTV app, sign in with this lounge account, and pick this screen.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {tvs.map((d) => {
          const s = lastSeenLabel(d.lastSeen);
          return (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 px-4 py-3">
              <Tv size={16} strokeWidth={1.5} className="text-ember-400" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-paper">{d.name}</div>
                <div className="flex items-center gap-1.5 text-xs text-smoke-400">
                  {s.online ? <Wifi size={11} className="text-green-400" /> : <WifiOff size={11} />}
                  {s.text}
                </div>
              </div>
              <div className="text-right">
                <div className="tabular text-sm text-ember-100">+{credits[d.id] ?? 0}</div>
                <div className="text-[10px] uppercase tracking-wider text-smoke-500">today</div>
              </div>
              <button onClick={() => remove(d.id)} className="text-smoke-500 hover:text-red-400" title="Remove">
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          );
        })}
        {tvs.length === 0 && <div className="text-sm text-smoke-400">No streaming TVs yet. Add one for each screen showing CigarTV.</div>}
      </div>

      {menus.length > 0 && (
        <div className="mt-6">
          <h3 className="eyebrow mb-2">Digital menu screens</h3>
          <div className="space-y-2">
            {menus.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/40 px-4 py-3">
                <Monitor size={16} strokeWidth={1.5} className="text-ember-400" />
                <div className="min-w-0 flex-1 text-sm text-paper">{d.name}</div>
                <Link href={`/m/${lounge.slug}`} target="_blank" className="btn-ghost text-xs">
                  <ExternalLink size={13} strokeWidth={1.5} /> Open menu
                </Link>
                <button onClick={() => remove(d.id)} className="text-smoke-500 hover:text-red-400" title="Remove">
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg border-[0.5px] border-ember-400/20 bg-ember-400/5 p-4 text-xs text-smoke-200">
        <div className="mb-1 flex items-center gap-1.5 text-ember-100"><Monitor size={13} strokeWidth={1.5} /> Digital menu display</div>
        Show your published inventory as a full-screen menu on any TV or browser:
        <Link href={`/m/${lounge.slug}`} target="_blank" className="ml-1 text-ember-100 underline">myhumidor.shop/m/{lounge.slug}</Link>.
        Publish items from the Inventory tab to control what appears.
      </div>
    </div>
  );
}

function Toggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border-[0.5px] px-2.5 py-2 text-xs transition ${
        on ? 'border-ember-400/50 bg-ember-400/15 text-ember-100' : 'border-ember-400/20 text-smoke-300 hover:text-paper'
      }`}
    >
      {icon} {label}
    </button>
  );
}
