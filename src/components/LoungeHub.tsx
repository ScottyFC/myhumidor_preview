'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, Package, Ticket, Boxes, Settings as SettingsIcon, Tv, ArrowRight } from 'lucide-react';
import { LoungeDashboard } from '@/components/LoungeDashboard';
import { LiveStream } from '@/components/LiveStream';
import { LoungeDetailsEditor } from '@/components/LoungeDetailsEditor';
import { ChainAndStaff } from '@/components/ChainAndStaff';
import { LoungeBadges } from '@/components/LoungeBadges';
import { CertificationTiers } from '@/components/CertificationTiers';
import { PreorderManager } from '@/components/PreorderManager';
import { WholesaleBrowser } from '@/components/WholesaleBrowser';
import InventoryPage from '@/app/dashboard/inventory/page';
import { listLoungePreorders } from '@/lib/preorders';

type Tab = 'overview' | 'inventory' | 'preorders' | 'wholesale' | 'settings';

export function LoungeHub() {
  const [tab, setTab] = useState<Tab>('overview');
  const [pendingPre, setPendingPre] = useState<number | null>(null);

  const loadCounts = useCallback(async () => {
    const r = await listLoungePreorders();
    setPendingPre((r.preorders ?? []).filter((p) => p.status === 'pending').length);
  }, []);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  const tabs: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'preorders', label: 'Pre-orders', icon: Ticket },
    { id: 'wholesale', label: 'Wholesale', icon: Boxes },
    { id: 'settings', label: 'Lounge', icon: SettingsIcon },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1.5 border-b-[0.5px] border-ember-400/15 pb-3">
        {tabs.map((t) => {
          const Icon = t.icon; const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-ember-400/15 text-ember-100' : 'text-smoke-300 hover:bg-ember-400/5 hover:text-paper'}`}>
              <Icon size={15} strokeWidth={1.5} /> {t.label}
              {t.id === 'preorders' && pendingPre ? <span className="ml-0.5 rounded-full bg-ember-400 px-1.5 text-[10px] font-medium text-ink">{pendingPre}</span> : null}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <Overview pendingPre={pendingPre} onJump={setTab} />}
      {tab === 'inventory' && <div className="-mx-6 -mt-8"><InventoryPage /></div>}
      {tab === 'preorders' && <div onClick={loadCounts}><PreorderManager /></div>}
      {tab === 'wholesale' && (
        <section>
          <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Boxes size={18} className="text-ember-400" /> Wholesale</h2>
          <p className="mt-2 mb-4 text-sm text-smoke-400">Order cigars by the box from Premier brands and message them directly.</p>
          <WholesaleBrowser />
        </section>
      )}
      {tab === 'settings' && (
        <div className="space-y-10">
          <section><div className="eyebrow mb-4 flex items-center gap-2"><Tv size={13} strokeWidth={1.5} className="text-ember-400" /> On your screen now</div><LiveStream /></section>
          <section className="border-t border-ember-400/10 pt-8"><CertificationTiers /></section>
          <section className="border-t border-ember-400/10 pt-8"><LoungeDetailsEditor /></section>
          <section className="border-t border-ember-400/10 pt-8"><ChainAndStaff /></section>
          <section className="border-t border-ember-400/10 pt-8"><LoungeBadges /></section>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, hint, onClick, urgent }: { label: string; value: string | number; hint?: string; onClick?: () => void; urgent?: boolean }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className={`rounded-xl border-[0.5px] p-4 text-left transition ${urgent ? 'border-ember-400/40 bg-ember-400/5' : 'border-ember-400/15 bg-char/30'} ${onClick ? 'hover:border-ember-400/50' : ''}`}>
      <div className="text-xs uppercase tracking-wide text-smoke-400">{label}</div>
      <div className="mt-1 font-display text-3xl tracking-tightest text-paper">{value}</div>
      {hint && <div className="mt-1 inline-flex items-center gap-1 text-xs text-ember-300">{hint} {onClick && <ArrowRight size={11} />}</div>}
    </button>
  );
}

function Overview({ pendingPre, onJump }: { pendingPre: number | null; onJump: (t: Tab) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-tightest">Pending tasks</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card label="Pre-orders to approve" value={pendingPre ?? '—'} hint={pendingPre ? 'Review now' : undefined} urgent={!!pendingPre} onClick={() => onJump('preorders')} />
          <Card label="Inventory" value="Manage" hint="Open" onClick={() => onJump('inventory')} />
          <Card label="Wholesale" value="Order" hint="Browse brands" onClick={() => onJump('wholesale')} />
        </div>
      </div>
      <div className="border-t border-ember-400/10 pt-6">
        <LoungeDashboard />
      </div>
    </div>
  );
}
