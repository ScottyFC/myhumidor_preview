import type { Metadata } from 'next';
import { MyPreorders } from '@/components/MyPreorders';

export const metadata: Metadata = { title: 'Pre-Orders · MyHumidor' };

export default function PreordersPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="eyebrow text-ember-300">Reservations</div>
      <h1 className="font-display text-3xl tracking-tightest">Pre-Orders</h1>
      <p className="mt-1 mb-6 text-sm text-smoke-400">Your reserved releases. Show the QR code or confirmation number at the lounge to pick up.</p>
      <MyPreorders />
    </main>
  );
}
