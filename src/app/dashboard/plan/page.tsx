'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Check, Loader2, ExternalLink } from 'lucide-react';
import { getMyLounges, setCertTier, type MyLounge } from '@/lib/lounges-owner';
import { PLAN_TIERS, startCheckout, openBillingPortal, type Tier } from '@/lib/billing';

const ORDER = ['none', 'starter', 'pro', 'premier'];

function MyPlanInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [lounge, setLounge] = useState<MyLounge | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getMyLounges().then((mine) => {
      setLounge(mine.find((l) => l.certified) ?? mine[0] ?? null);
      setLoading(false);
    });
    const status = sp.get('status');
    if (status === 'success') setMsg('Payment received — your plan is being activated.');
    if (status === 'cancel') setMsg('Checkout canceled — no changes made.');
  }, [sp]);

  const current = lounge?.certTier ?? 'none';

  async function choose(tier: Tier) {
    if (!lounge) return;
    setBusy(tier); setMsg('');
    const res = await startCheckout(lounge.slug, tier);
    if (res.url) { window.location.href = res.url; return; }
    if (res.fallback) {
      // Stripe not configured → apply the tier directly (free path).
      const r = await setCertTier(lounge.loungeId, tier);
      if (r.ok) { setLounge({ ...lounge, certTier: tier, certified: true }); setMsg(`Switched to ${tier}. (Billing isn’t connected yet, so this was applied directly.)`); }
      else setMsg(r.error ?? 'Could not change plan.');
    } else setMsg(res.error ?? 'Could not start checkout.');
    setBusy(null);
  }

  async function manage() {
    if (!lounge) return;
    setBusy('portal');
    const res = await openBillingPortal(lounge.slug);
    if (res.url) window.location.href = res.url;
    else setMsg('Billing management isn’t available yet — connect Stripe to enable it.');
    setBusy(null);
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 pt-16 text-center"><Loader2 className="mx-auto animate-spin text-ember-400" /></div>;
  if (!lounge) return (
    <div className="mx-auto max-w-2xl px-6 pt-10">
      <h1 className="font-display text-4xl tracking-tightest">My Plan</h1>
      <p className="mt-2 text-sm text-smoke-400">You don’t manage a lounge yet. Claim or add one to choose a certification plan.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <h1 className="font-display text-4xl tracking-tightest">My Plan</h1>
      <p className="mt-1 text-sm text-smoke-400">{lounge.name} · current plan: <span className="text-ember-100">{current === 'none' ? 'Free' : current[0].toUpperCase() + current.slice(1)}</span></p>
      {msg && <p className="mt-3 rounded-lg border-[0.5px] border-ember-400/25 bg-ember-400/10 px-3 py-2 text-sm text-ember-100">{msg}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {PLAN_TIERS.map((t) => {
          const active = current === t.id;
          const isUpgrade = ORDER.indexOf(t.id) > ORDER.indexOf(current);
          return (
            <div key={t.id} className={`rounded-2xl border-[0.5px] p-5 ${active ? 'border-ember-400 bg-ember-400/5' : 'border-ember-400/15 bg-char/40'}`}>
              <div className="font-display text-lg">{t.name}</div>
              <div className="mt-1 font-display text-3xl tabular text-ember-100">{t.price}</div>
              <p className="mt-1 text-xs text-smoke-400">{t.blurb}</p>
              <ul className="mt-3 space-y-1.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-smoke-200"><Check size={12} className="mt-0.5 shrink-0 text-ember-400" /> {f}</li>
                ))}
              </ul>
              <button
                onClick={() => choose(t.id)}
                disabled={active || busy === t.id}
                className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-60 ${active ? 'border-[0.5px] border-ember-400/30 text-ember-100' : 'bg-ember-400 text-paper hover:bg-ember-600'}`}
              >
                {busy === t.id ? <Loader2 size={13} className="animate-spin" /> : null}
                {active ? 'Current plan' : isUpgrade ? `Upgrade to ${t.name}` : `Switch to ${t.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ember-400/10 pt-5">
        <button onClick={manage} disabled={busy === 'portal'} className="inline-flex items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-4 py-2 text-xs font-medium text-ember-100 hover:bg-ember-400/10 disabled:opacity-60">
          {busy === 'portal' ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />} Manage billing & invoices
        </button>
        {current !== 'none' && (
          <button onClick={() => choose('starter')} className="text-xs text-smoke-400 underline hover:text-smoke-200">Downgrade</button>
        )}
        <a href="/verify" className="ml-auto inline-flex items-center gap-1 text-xs text-ember-200 hover:text-ember-400">Compare plans <ExternalLink size={11} /></a>
      </div>
    </div>
  );
}

export default function MyPlanPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 pt-16 text-center text-smoke-400">Loading…</div>}>
      <MyPlanInner />
    </Suspense>
  );
}
