import Link from 'next/link';
import { BadgeCheck, Users, Clock, Zap, Wallet, Tv, Lock, ArrowRight, Package } from 'lucide-react';
import { getOwnerDashboard } from '@/lib/mock-data';
import { LiveStream } from '@/components/LiveStream';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Lounge Dashboard · MyHumidor by CigarTV',
};

export default function DashboardPage() {
  const d = getOwnerDashboard();
  const maxHours = Math.max(...d.watchHours7d.map((x) => x.hours));

  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      {/* Private scope banner */}
      <div className="mb-6 flex items-center gap-2 rounded-md border-[0.5px] border-ember-400/20 bg-ember-400/5 px-4 py-2 text-xs text-smoke-200">
        <Lock size={12} strokeWidth={1.5} className="text-ember-400" />
        Private to your lounge. Viewership and earnings are visible only to verified owners of this location.
      </div>

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Lounge dashboard</div>
          <h1 className="flex items-center gap-2 font-display text-5xl tracking-tightest">
            {d.lounge.name}
            <BadgeCheck size={28} strokeWidth={1.5} className="text-ember-400" />
          </h1>
          <div className="mt-2 text-sm text-smoke-400">
            {d.lounge.city}, {d.lounge.state}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 px-4 py-2">
          <Tv size={15} strokeWidth={1.5} className="text-ember-400" />
          <div className="text-sm">
            <div className="font-medium">{d.device.serial}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-smoke-400">
              <span
                className={cn(
                  'inline-block h-1.5 w-1.5 rounded-full',
                  d.device.online ? 'animate-ember-pulse bg-red-500' : 'bg-smoke-400'
                )}
              />
              {d.device.online ? `Streaming · ${d.device.lastSeen}` : 'Offline'}
            </div>
          </div>
        </div>
      </header>

      {/* Quick actions */}
      <div className="mb-6">
        <Link href="/dashboard/inventory" className="btn-primary">
          <Package size={15} strokeWidth={1.5} /> Manage inventory
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Viewers now" value={String(d.viewersNow)} live />
        <Stat icon={Clock} label="Watch-hrs today" value={d.watchHoursToday.toFixed(1)} />
        <Stat icon={Zap} label="Credits today" value={`+${d.creditsToday.toLocaleString()}`} accent />
        <Stat icon={Wallet} label="Credit balance" value={d.creditBalance.toLocaleString()} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Live channel on this lounge's stick */}
        <section className="lg:col-span-2">
          <div className="eyebrow mb-4 flex items-center gap-2">
            <Tv size={13} strokeWidth={1.5} className="text-ember-400" />
            On your screen now
          </div>
          <LiveStream />
          <p className="mt-3 text-xs text-smoke-400">
            This is the live CigarTV feed currently playing on {d.device.serial}. Viewing time on
            this device is what accrues your credits.
          </p>
        </section>

        {/* Credit ledger */}
        <section>
          <div className="eyebrow mb-4">Credit ledger</div>
          <div className="space-y-2">
            {d.ledger.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm">{e.reason}</div>
                  <div className="text-[11px] text-smoke-400">{e.recordedAt}</div>
                </div>
                <div
                  className={cn(
                    'shrink-0 font-display text-base tabular',
                    e.delta >= 0 ? 'text-ember-100' : 'text-smoke-400'
                  )}
                >
                  {e.delta >= 0 ? '+' : ''}
                  {e.delta.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <Link href="/lounges" className="btn-ghost mt-4 w-full justify-center text-xs">
            Spend credits on a campaign <ArrowRight size={13} strokeWidth={1.5} />
          </Link>
        </section>
      </div>

      {/* 7-day watch hours */}
      <section className="mt-8">
        <div className="eyebrow mb-4">Watch-hours · last 7 days</div>
        <div className="flex items-end justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-5" style={{ height: 220 }}>
          {d.watchHours7d.map((x) => (
            <div key={x.day} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div className="text-[11px] tabular text-smoke-400">{x.hours.toFixed(1)}</div>
              <div
                className="w-full rounded-t bg-ember-400/80"
                style={{ height: `${(x.hours / maxHours) * 130}px` }}
              />
              <div className="text-[11px] uppercase tracking-wider text-smoke-400">{x.day}</div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-smoke-400">
        Numbers shown are example data. In production this view is gated by auth — a lounge owner
        only ever sees rows where <code className="text-ember-100">lounges.owner_id</code> matches
        their account, enforced by row-level security on the{' '}
        <code className="text-ember-100">viewership_events</code> and{' '}
        <code className="text-ember-100">credit_ledger</code> tables.
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  live,
}: {
  icon: typeof Tv;
  label: string;
  value: string;
  accent?: boolean;
  live?: boolean;
}) {
  return (
    <div className="rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 p-4">
      <div className="flex items-center justify-between">
        <Icon size={15} strokeWidth={1.5} className="text-ember-400" />
        {live && <span className="inline-block h-1.5 w-1.5 animate-ember-pulse rounded-full bg-red-500" />}
      </div>
      <div className={cn('mt-2 font-display text-2xl tabular leading-none', accent && 'text-ember-100')}>
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-smoke-400">{label}</div>
    </div>
  );
}
