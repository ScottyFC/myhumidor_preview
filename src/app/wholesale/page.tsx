import type { Metadata } from 'next';
import { WholesaleBrowser } from '@/components/WholesaleBrowser';

export const metadata: Metadata = { title: 'Wholesale · MyHumidor', description: 'Order premium cigars by the box from Premier brands.' };

export default function WholesalePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="eyebrow text-ember-300">Cigar broker</div>
      <h1 className="font-display text-4xl tracking-tightest">Wholesale</h1>
      <p className="mt-2 max-w-prose text-sm text-smoke-400">For lounge owners: order cigars by the box from Premier brands and message them directly. Orders and messaging require a signed-in lounge account.</p>
      <div className="mt-8"><WholesaleBrowser /></div>
    </main>
  );
}
