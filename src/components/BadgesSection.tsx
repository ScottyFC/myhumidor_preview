'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award } from 'lucide-react';
import { BadgeMedal } from '@/components/BadgeMedal';
import { VantaBackdrop } from '@/components/VantaBackdrop';
import { listBadges, earnedBadgeIds, evaluateAndAward, buildStats, type BadgeDef } from '@/lib/badges';
import type { CollectionItem } from '@/lib/collection';
import type { UserRating } from '@/lib/ratings';

const TIER_ORDER: Record<string, number> = { lounge: 0, rare: 1, gold: 2, silver: 3, bronze: 4 };

export function BadgesSection({
  userId, self, humidor, ratings,
}: {
  userId: string; self: boolean; humidor: CollectionItem[]; ratings: UserRating[];
}) {
  const [badges, setBadges] = useState<BadgeDef[] | null>(null);
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let off = false;
    (async () => {
      const all = await listBadges();
      if (self) await evaluateAndAward(userId, all, buildStats(humidor, ratings));
      const mine = await earnedBadgeIds(userId);
      if (!off) { setBadges(all); setEarned(mine); }
    })();
    return () => { off = true; };
  }, [userId, self, humidor, ratings]);

  const { earnedList, lockedList } = useMemo(() => {
    const list = (badges ?? []).filter((b) => !b.loungeId || earned.has(b.id));
    const sortFn = (a: BadgeDef, b: BadgeDef) =>
      (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9) || a.name.localeCompare(b.name);
    return {
      earnedList: list.filter((b) => earned.has(b.id)).sort(sortFn),
      lockedList: list.filter((b) => !earned.has(b.id)).sort(sortFn),
    };
  }, [badges, earned]);

  if (!badges || badges.length === 0) return null;

  const total = earnedList.length + lockedList.length;
  const lockedToShow = showAll ? lockedList : lockedList.slice(0, self ? 12 : 0);
  const display = [...earnedList, ...lockedToShow];

  return (
    <div className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-tightest">Badges</h2>
        <span className="eyebrow">{earnedList.length} of {total} earned</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border-[0.5px] border-ember-400/15">
        <VantaBackdrop className="absolute inset-0 opacity-40" />
        <div className="relative grid grid-cols-2 gap-x-4 gap-y-7 p-6 sm:grid-cols-3 md:grid-cols-4">
          {display.map((b) => (
            <div key={b.id} className="flex flex-col items-center">
              <BadgeMedal badge={b} earned={earned.has(b.id)} />
              {b.criteria && (
                <p className="mt-1 max-w-[150px] text-center text-[11px] leading-snug text-smoke-400">{b.criteria}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {self && earnedList.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-smoke-400">
            <Award size={13} strokeWidth={1.5} className="text-ember-400" />
            Rate cigars and build your humidor to start unlocking badges.
          </p>
        )}
        {lockedList.length > lockedToShow.length || (showAll && lockedList.length > 0) ? (
          <button onClick={() => setShowAll((v) => !v)} className="btn-ghost ml-auto text-xs">
            {showAll ? 'Show fewer' : `Show all ${total} badges`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
