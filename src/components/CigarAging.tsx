'use client';

import { useEffect, useState } from 'react';
import { Clock, Droplets, Thermometer, Lightbulb } from 'lucide-react';
import { subscribeAficionado } from '@/lib/aficionado';
import { getCollection, onCollectionChange, type CollectionItem } from '@/lib/collection';
import { agingInfo, type AgingInfo } from '@/lib/aging';

/** Aging status for THIS cigar, shown on its page when the signed-in member keeps
 *  it in their humidor: how long it's rested, when it's best to smoke, and how to
 *  store it. Aficionado-only (matches the Aging Tracker). */
export function CigarAging({ slug }: { slug: string }) {
  const [member, setMember] = useState(false);
  const [info, setInfo] = useState<AgingInfo | null>(null);

  useEffect(() => subscribeAficionado(setMember), []);
  useEffect(() => {
    const sync = () => {
      const item = getCollection().find((c: CollectionItem) => c.slug === slug && c.status === 'humidor');
      setInfo(item ? agingInfo(item.addedAt) : null);
    };
    sync();
    return onCollectionChange(sync);
  }, [slug]);

  if (!member || !info) return null;

  return (
    <div className="mt-6 rounded-xl border-[0.5px] border-ember-400/20 bg-char/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-ember-400" />
          <h3 className="font-display text-lg">In your humidor</h3>
        </div>
        <div className="text-right">
          <div className="text-sm text-paper">{info.ageLabel}</div>
          <div className={`text-[11px] ${info.tone}`}>{info.status}</div>
        </div>
      </div>

      <p className="mt-3 text-sm text-ember-100">{info.whenToSmoke}</p>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-ember-400/10 pt-3 text-xs text-smoke-300">
        <span className="flex items-center gap-1.5"><Droplets size={13} className="text-ember-400" /> {info.humidity}</span>
        <span className="flex items-center gap-1.5"><Thermometer size={13} className="text-ember-400" /> {info.temperature}</span>
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] text-smoke-500"><Lightbulb size={12} className="mt-0.5 shrink-0 text-ember-400/70" /> {info.tip}</p>
    </div>
  );
}
