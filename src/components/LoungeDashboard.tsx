'use client';

import { useEffect, useState } from 'react';
import { Users, Clock, Zap, Wallet, BadgeCheck, Pencil, Check, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { LoungeLogoEditor } from '@/components/LoungeLogoEditor';
import { getMyLounges, type MyLounge } from '@/lib/lounges-owner';
import {
  listDevices, recentLedger, streamStats7d, renameLounge,
  type LoungeDevice, type CreditLedgerEntry, type DayStat,
} from '@/lib/devices';

function isOnline(iso: string | null) {
  return !!iso && Date.now() - new Date(iso).getTime() < 5 * 60_000;
}
function ago(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

export function LoungeDashboard() {
  const [lounge, setLounge] = useState<MyLounge | null>(null);
  const [hasVenue, setHasVenue] = useState(false);
  const [devices, setDevices] = useState<LoungeDevice[]>([]);
  const [week, setWeek] = useState<DayStat[]>([]);
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let off = false;
    getMyLounges().then(async (ls) => {
      if (off) return;
      const l = ls[0] ?? null;
      setLounge(l);
      setHasVenue(!!l);
      setName(l?.name ?? '');
      if (l) {
        const [d, w, led] = await Promise.all([
          listDevices(l.loungeId), streamStats7d(l.loungeId), recentLedger(l.loungeId, 8),
        ]);
        setDevices(d); setWeek(w); setLedger(led);
      } else {
        setWeek(await streamStats7d(''));
      }
      setLoading(false);
    });
    return () => { off = true; };
  }, []);

  async function saveName() {
    setSaving(true);
    const res = await renameLounge(lounge?.loungeId ?? null, name);
    setSaving(false);
    if (res.ok) { setEditing(false); if (lounge) setLounge({ ...lounge, name: name.trim() }); }
  }

  if (loading) return <div className="py-10"><Loader2 size={20} className="animate-spin text-ember-400" /></div>;

  const tvs = devices.filter((d) => d.kind === 'tv');
  const online = tvs.filter((d) => isOnline(d.lastSeen)).length;
  const balance = lounge?.credits ?? 1000;            // fresh signup → starting balance
  const todayHours = week.length ? week[week.length - 1].hours : 0;
  const todayCredits = week.length ? week[week.length - 1].credits : 0;
  const maxHours = Math.max(0.5, ...week.map((x) => x.hours));
  const verifiedCertified = !!(lounge?.verified && lounge?.certified);

  return (
    <div>
      {/* Header — real name, editable */}
      <header className="mb-8">
        <div className="eyebrow mb-2">Lounge dashboard</div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="rounded-md border-[0.5px] border-ember-400/30 bg-char/80 px-3 py-2 font-display text-3xl tracking-tightest text-paper focus:border-ember-400 focus:outline-none"
            />
            <button onClick={saveName} disabled={saving} className="btn-primary text-xs">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={1.5} />} Save
            </button>
          </div>
        ) : (
          <h1 className="flex items-center gap-2 font-display text-5xl tracking-tightest">
            {lounge?.name || 'Your lounge'}
            {verifiedCertified && <BadgeCheck size={28} strokeWidth={1.5} className="text-ember-400" />}
            <button onClick={() => setEditing(true)} className="text-smoke-500 hover:text-ember-100" title="Rename">
              <Pencil size={16} strokeWidth={1.5} />
            </button>
          </h1>
        )}
        {lounge && (lounge.city || lounge.state) && (
          <div className="mt-2 text-sm text-smoke-400">{[lounge.city, lounge.state].filter(Boolean).join(', ')}</div>
        )}

        {/* Shop logo (customers see this on the shop page) + view shop link */}
        {lounge?.slug && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <LoungeLogoEditor slug={lounge.slug} force />
            <Link href={`/lounges/${lounge.slug}`} className="btn-ghost text-xs">
              <ExternalLink size={14} strokeWidth={1.5} /> View shop page
            </Link>
          </div>
        )}

        {!hasVenue && (
          <div className="mt-3 text-xs text-smoke-400">
            New lounge — you’re starting with {balance.toLocaleString()} credits. Verify your lounge to register TVs and start earning.
          </div>
        )}
      </header>

      {/* Stats — Devices Online (red/green) + real numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4">
          <div className="flex items-center justify-between">
            <Users size={15} strokeWidth={1.5} className="text-ember-400" />
            <span className={`inline-block h-2 w-2 rounded-full ${online > 0 ? 'animate-ember-pulse bg-green-500' : 'bg-red-500'}`} />
          </div>
          <div className="mt-2 font-display text-2xl tabular leading-none">{online}<span className="text-base text-smoke-400">/{tvs.length || 0}</span></div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-smoke-400">Devices online</div>
        </div>
        <Stat icon={Clock} label="Watch-hrs today" value={todayHours.toFixed(1)} />
        <Stat icon={Zap} label="Credits today" value={`+${todayCredits.toLocaleString()}`} accent />
        <Stat icon={Wallet} label="Credit balance" value={balance.toLocaleString()} />
      </div>

      {/* 7-day stream hours (real) */}
      <section className="mt-8">
        <div className="eyebrow mb-4">Stream-hours · last 7 days</div>
        <div className="flex items-end justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-5" style={{ height: 220 }}>
          {week.map((x, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div className="text-[11px] tabular text-smoke-400">{x.hours.toFixed(1)}</div>
              <div className="w-full rounded-t bg-ember-400/80" style={{ height: `${(x.hours / maxHours) * 130}px` }} />
              <div className="text-[11px] uppercase tracking-wider text-smoke-400">{x.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Credit ledger (real) */}
      <section className="mt-8">
        <div className="eyebrow mb-4">Credit ledger</div>
        {ledger.length === 0 ? (
          <div className="text-sm text-smoke-400">No credit activity yet. Stream CigarTV on a registered TV to start earning.</div>
        ) : (
          <div className="space-y-2">
            {ledger.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm capitalize">{e.reason.replace('_', ' ')}</div>
                  <div className="text-[11px] text-smoke-400">{e.createdAt ? ago(e.createdAt) : ''}</div>
                </div>
                <div className={`shrink-0 font-display text-base tabular ${e.amount >= 0 ? 'text-ember-100' : 'text-smoke-400'}`}>
                  {e.amount >= 0 ? '+' : ''}{e.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Users; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4">
      <Icon size={15} strokeWidth={1.5} className="text-ember-400" />
      <div className={`mt-2 font-display text-2xl tabular leading-none ${accent ? 'text-ember-100' : ''}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-smoke-400">{label}</div>
    </div>
  );
}
