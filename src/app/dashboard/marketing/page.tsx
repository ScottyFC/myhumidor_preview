'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Tag, Sparkles, CalendarDays, Wallet, Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  icon: LucideIcon;
  title: string;
  body: string;
  cost: string; // TBD for now
}

const OPTIONS: Option[] = [
  {
    id: 'boost_map',
    icon: MapPin,
    title: 'Boost your location on the map',
    body: 'Featured pin in Cigar Maps and priority placement in “nearest lounges” for members in your radius.',
    cost: 'TBD',
  },
  {
    id: 'promote_deal',
    icon: Tag,
    title: 'Promote a deal',
    body: 'Push a discount or special to the feeds of members nearby and anyone who follows your lounge.',
    cost: 'TBD',
  },
  {
    id: 'new_arrivals',
    icon: Sparkles,
    title: 'Promote new arrivals',
    body: 'Spotlight cigars you just stocked. Links straight to each cigar’s profile so members can wishlist it.',
    cost: 'TBD',
  },
  {
    id: 'event',
    icon: CalendarDays,
    title: 'Promote an event',
    body: 'Herf nights, rep visits, releases. Appears in the feed with date, details, and an RSVP link.',
    cost: 'TBD',
  },
];

const CREDIT_BALANCE = 12450; // demo; in production this is the lounge's live balance

export default function MarketingPage() {
  const [active, setActive] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 pt-10">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-smoke-400 hover:text-paper"
      >
        <ArrowLeft size={12} strokeWidth={1.5} /> Dashboard
      </Link>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Marketing</div>
          <h1 className="font-display text-5xl tracking-tightest">Spend your credits</h1>
          <p className="mt-2 max-w-2xl text-smoke-200">
            Turn viewership credits into visibility. Pick a campaign and we’ll get it in front of the
            right members.
          </p>
        </div>
        <div className="rounded-lg border-[0.5px] border-ember-400/20 bg-char/50 px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-smoke-400">
            <Wallet size={12} strokeWidth={1.5} className="text-ember-400" /> Credit balance
          </div>
          <div className="font-display text-2xl tabular text-ember-100">{CREDIT_BALANCE.toLocaleString()}</div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const on = active.has(o.id);
          return (
            <div
              key={o.id}
              className={cn(
                'flex flex-col rounded-xl border-[0.5px] p-5 transition',
                on ? 'border-ember-400 bg-ember-400/5' : 'border-ember-400/15 bg-char/40'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon size={18} strokeWidth={1.5} className="text-ember-400" />
                <h2 className="font-display text-lg font-medium">{o.title}</h2>
              </div>
              <p className="mt-2 flex-1 text-sm text-smoke-300">{o.body}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-smoke-400">
                  Cost: <span className="text-ember-100">{o.cost}</span>
                </span>
                <button
                  onClick={() => toggle(o.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition',
                    on ? 'bg-ember-600/30 text-ember-100' : 'bg-ember-400 text-paper hover:bg-ember-600'
                  )}
                >
                  {on ? (
                    <>
                      <Check size={14} strokeWidth={2} /> Active
                    </>
                  ) : (
                    'Promote'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-smoke-400">
        Pricing is being finalized — costs show as TBD for now. When live, activating a campaign
        debits credits from your balance and writes to the <code className="text-ember-100">ad_campaigns</code>{' '}
        and <code className="text-ember-100">credit_ledger</code> tables.
      </p>
    </div>
  );
}
