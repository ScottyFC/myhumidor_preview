import Link from 'next/link';
import { Tv, Lock, Package } from 'lucide-react';
import { LiveStream } from '@/components/LiveStream';
import { LoungeDashboard } from '@/components/LoungeDashboard';
import { DeviceManager } from '@/components/DeviceManager';
import { LoungeDetailsEditor } from '@/components/LoungeDetailsEditor';
import { ChainAndStaff } from '@/components/ChainAndStaff';
import { CertificationTiers } from '@/components/CertificationTiers';

export const metadata = {
  title: 'Lounge Dashboard · MyHumidor by CigarTV',
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pt-10">
      {/* Private scope banner */}
      <div className="mb-6 flex items-center gap-2 rounded-md border-[0.5px] border-ember-400/20 bg-ember-400/5 px-4 py-2 text-xs text-smoke-200">
        <Lock size={12} strokeWidth={1.5} className="text-ember-400" />
        Private to your lounge. Viewership and earnings are visible only to verified owners of this location.
      </div>

      {/* Real, account-driven dashboard: name, devices online, credits, 7-day, ledger */}
      <LoungeDashboard />

      {/* Quick action */}
      <div className="mt-6">
        <Link href="/dashboard/inventory" className="btn-primary">
          <Package size={15} strokeWidth={1.5} /> Manage inventory
        </Link>
      </div>

      {/* Certification plans (Untappd-for-Business style) */}
      <CertificationTiers />

      {/* Live channel */}
      <section className="mt-8">
        <div className="eyebrow mb-4 flex items-center gap-2">
          <Tv size={13} strokeWidth={1.5} className="text-ember-400" />
          On your screen now
        </div>
        <LiveStream />
      </section>

      {/* Hours, food badge & menu */}
      <section className="mt-10 border-t border-ember-400/10 pt-8">
        <LoungeDetailsEditor />
      </section>

      {/* Staff access + multi-lounge claims */}
      <section className="mt-10 border-t border-ember-400/10 pt-8">
        <ChainAndStaff />
      </section>

      {/* Screens & credits (register a TV per screen, see earnings) */}
      <section className="mt-10 border-t border-ember-400/10 pt-8">
        <DeviceManager />
      </section>
    </div>
  );
}
