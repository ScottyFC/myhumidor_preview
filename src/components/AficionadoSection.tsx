'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Sparkles, BadgeCheck, Gift, ShieldOff, Crown, Check } from 'lucide-react';
import { subscribeAficionado } from '@/lib/aficionado';
import { subscribeAuth } from '@/lib/auth';

const PERKS = [
  { icon: Clock, title: 'Aging Tracker', body: 'Know exactly when each cigar enters its prime smoking window.' },
  { icon: Sparkles, title: 'Flavor Profiling', body: 'AI picks your next cigar from what you’ve loved — and tells you where it’s in stock nearby.' },
  { icon: ShieldOff, title: 'Ad-Free Feed', body: 'No sponsored posts in your social timeline. Ever.' },
  { icon: Gift, title: 'Exclusive Giveaways', body: 'Automatic monthly entry into rare-cigar raffles.' },
  { icon: BadgeCheck, title: 'Exclusive Badges', body: 'Collect members-only badges no one else can earn.' },
  { icon: Crown, title: 'Verified Aficionado', body: 'A verified badge on your profile that says you take this seriously.' },
];

export function AficionadoSection() {
  const [member, setMember] = useState(false);
  const [isRetailer, setIsRetailer] = useState(false);
  useEffect(() => subscribeAficionado(setMember), []);
  useEffect(() => subscribeAuth((s) => setIsRetailer(s?.type === 'retailer')), []);

  // Aficionado is a member-only upgrade — never shown to retailer accounts.
  if (isRetailer) return null;

  return (
    <section className="py-12">
      <div className="overflow-hidden rounded-2xl border-[0.5px] border-ember-400/25 bg-gradient-to-b from-ember-400/10 to-char/40 p-8 sm:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-2 flex items-center gap-1.5">
              <Crown size={13} strokeWidth={1.5} className="text-ember-400" /> Freemium · the core app stays free
            </div>
            <h2 className="font-display text-3xl tracking-tightest sm:text-4xl">MyHumidor Aficionado</h2>
            <p className="mt-2 max-w-xl text-smoke-200">
              Everything you love about MyHumidor stays free. Aficionado adds the power tools for people
              who live in their humidor.
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl text-paper">
              $3.99<span className="text-base text-smoke-400">–$5.99/mo</span>
            </div>
            <div className="text-sm text-smoke-400">or $40/year</div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERKS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/40 p-4">
                <Icon size={18} strokeWidth={1.5} className="text-ember-400" />
                <div className="mt-2 font-medium">{p.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-smoke-300">{p.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          {member ? (
            <span className="inline-flex items-center gap-2 rounded-md border-[0.5px] border-ember-400/40 bg-ember-400/10 px-4 py-2 text-sm font-medium text-ember-100">
              <Check size={15} strokeWidth={2} /> You’re an Aficionado — all perks unlocked.
            </span>
          ) : (
            <Link href="/account?upgrade=aficionado" className="btn-primary text-base">
              Become an Aficionado <Crown size={15} strokeWidth={1.5} />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
