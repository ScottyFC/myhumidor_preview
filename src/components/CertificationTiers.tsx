'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Check, Loader2, ShieldCheck, Sparkles, Crown } from 'lucide-react';
import { getMyLounges, setCertTier, type MyLounge, type CertTier } from '@/lib/lounges-owner';
import { cn } from '@/lib/utils';

const TIERS: Array<{
  id: Exclude<CertTier, 'none'>;
  name: string; price: string; icon: typeof ShieldCheck; blurb: string; features: string[];
}> = [
  {
    id: 'starter', name: 'Starter', price: '$49/mo', icon: ShieldCheck,
    blurb: 'Get certified and stand out in search.',
    features: ['Certified badge on your shop page', 'Digital menu for in-lounge screens', 'Post updates, promos & events', 'Customer check-in feed'],
  },
  {
    id: 'pro', name: 'Pro', price: '$99/mo', icon: Sparkles,
    blurb: 'Grow the room with promotion tools.',
    features: ['Everything in Starter', 'Boosted posts at member rates', 'Viewership & credit analytics', 'Priority listing in your city'],
  },
  {
    id: 'premier', name: 'Premier', price: '$199/mo', icon: Crown,
    blurb: 'The full CigarTV partnership.',
    features: ['Everything in Pro', 'Featured placement across MyHumidor', 'CigarTV ad-overlay slots on the live feed', 'Dedicated partner support'],
  },
];

/**
 * Untappd-for-Business-style plans. Verification is the free prerequisite;
 * certification is one of three paid tiers, switched (up or down) right here.
 */
export function CertificationTiers() {
  const [lounge, setLounge] = useState<MyLounge | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<CertTier | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let off = false;
    getMyLounges().then((ls) => { if (!off) { setLounge(ls[0] ?? null); setLoading(false); } });
    return () => { off = true; };
  }, []);

  async function choose(tier: CertTier) {
    if (!lounge) return;
    setBusy(tier); setMsg('');
    const res = await setCertTier(lounge.loungeId, tier);
    setBusy(null);
    if (res.ok) setLounge({ ...lounge, certTier: tier, certified: tier !== 'none' });
    else setMsg(res.error ?? 'Could not change your plan.');
  }

  if (loading) return null;
  if (!lounge) return null;
  // Once a plan is selected, plans are managed from My Plan — hide here.
  if ((lounge.certTier as string) !== 'none') return null;

  // Not verified yet → certification isn't available; point at the free step.
  if (!lounge.verified) {
    return (
      <section className="mt-10 rounded-2xl border-[0.5px] border-dashed border-ember-400/25 bg-char/30 p-6">
        <div className="eyebrow mb-1">Certification</div>
        <p className="max-w-xl text-sm text-smoke-300">
          Certification unlocks after your lounge is <span className="text-ember-100">verified</span> (free).
          Verify first, then choose a plan here.
        </p>
        <Link href="/verify" className="btn-primary mt-3 inline-flex text-xs">
          <ShieldCheck size={14} strokeWidth={1.5} /> Verify your lounge
        </Link>
      </section>
    );
  }

  const current = lounge.certTier;

  return (
    <section className="mt-10">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-tightest">Certification</h2>
        {current !== 'none' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ember-400/10 px-2.5 py-1 text-xs font-medium text-ember-100 ring-1 ring-ember-400/30">
            <BadgeCheck size={13} strokeWidth={2} /> Certified · {TIERS.find((t) => t.id === current)?.name}
          </span>
        )}
      </div>
      <p className="mb-5 max-w-2xl text-sm text-smoke-400">
        Pick the plan that fits your lounge — upgrade or downgrade any time, changes apply immediately.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((t) => {
          const active = current === t.id;
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              className={cn(
                'relative flex flex-col overflow-hidden rounded-2xl border-[0.5px] p-5 transition',
                active
                  ? 'border-ember-400/60 bg-gradient-to-b from-ember-400/10 to-char/40 shadow-[0_0_36px_rgba(240,195,85,0.12)]'
                  : 'border-ember-400/15 bg-char/40 hover:border-ember-400/35'
              )}
            >
              {t.id === 'pro' && !active && (
                <span className="absolute right-4 top-4 rounded-full bg-ember-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ember-100 ring-1 ring-ember-400/30">
                  Popular
                </span>
              )}
              <Icon size={20} strokeWidth={1.5} className="text-ember-400" />
              <div className="mt-2 font-display text-xl">{t.name}</div>
              <div className="font-display text-3xl tabular text-ember-100">{t.price}</div>
              <p className="mt-1 text-xs text-smoke-400">{t.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-smoke-200">
                    <Check size={13} strokeWidth={2} className="mt-0.5 shrink-0 text-ember-400" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => choose(active ? 'none' : t.id)}
                disabled={busy !== null}
                className={cn(
                  'mt-5 w-full rounded-full py-2 text-xs font-medium transition disabled:opacity-60',
                  active
                    ? 'border-[0.5px] border-ember-400/30 text-smoke-300 hover:text-red-300'
                    : 'bg-ember-400 text-paper hover:bg-ember-600'
                )}
              >
                {busy === (active ? 'none' : t.id) ? <Loader2 size={13} className="mx-auto animate-spin" />
                  : active ? 'Cancel plan'
                  : current === 'none' ? `Choose ${t.name}`
                  : TIERS.findIndex((x) => x.id === t.id) > TIERS.findIndex((x) => x.id === current) ? `Upgrade to ${t.name}` : `Downgrade to ${t.name}`}
              </button>
            </div>
          );
        })}
      </div>
      {msg && <p className="mt-2 text-xs text-red-400">{msg}</p>}
      <p className="mt-3 text-[11px] text-smoke-500">
        Billing integration is on the way — plan changes apply to your listing immediately and you won&apos;t be charged yet.
      </p>
    </section>
  );
}
