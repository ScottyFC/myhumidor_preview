'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CreditCard, ArrowRight } from 'lucide-react';
import { subscribeAuth, type Session } from '@/lib/auth';

export default function MyPlanPage() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => subscribeAuth(setSession), []);
  const certified = !!(session && (session as { certified?: boolean }).certified);

  return (
    <div className="mx-auto max-w-2xl px-6 pt-10">
      <h1 className="font-display text-4xl tracking-tightest">My Plan</h1>
      <p className="mt-1 text-sm text-smoke-400">Manage your lounge’s certification plan and billing.</p>

      <div className="mt-6 rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-5">
        <div className="flex items-center gap-2 text-sm">
          <CreditCard size={16} className="text-ember-400" />
          <span className="text-smoke-300">Current plan:</span>
          <span className="font-medium text-paper">{certified ? 'Certified Lounge' : 'Free'}</span>
        </div>
        <Link href="/verify" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-ember-400 px-4 py-2 text-xs font-semibold text-paper hover:bg-ember-600">
          {certified ? 'Change plan' : 'Upgrade to Certified'} <ArrowRight size={13} strokeWidth={2} />
        </Link>
      </div>

      <p className="mt-4 text-xs text-smoke-500">
        Billing details and self-serve plan changes are being connected to the payment provider.
        For now, the certification plans and checkout live on the Plans page.
      </p>
    </div>
  );
}
