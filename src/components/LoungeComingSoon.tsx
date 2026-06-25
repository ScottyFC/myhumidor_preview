'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Ticket, Loader2, Check } from 'lucide-react';
import { CigarThumb } from '@/components/CigarThumb';
import type { InventoryItem } from '@/lib/inventory';
import { placePreorder } from '@/lib/preorders';
import { subscribeAuth } from '@/lib/auth';
import { subscribeAficionado } from '@/lib/aficionado';

export function LoungeComingSoon({ slug, items }: { slug: string; items: InventoryItem[] }) {
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const [signedIn, setSignedIn] = useState(false);
  const [afi, setAfi] = useState(false);
  const [state, setState] = useState<Record<string, 'idle' | 'busy' | 'done' | string>>({});

  useEffect(() => { fetch(`/api/preorders/remaining?slug=${slug}`).then((r) => r.json()).then((d) => setRemaining(d.remaining ?? {})).catch(() => {}); }, [slug]);
  useEffect(() => subscribeAuth((s) => setSignedIn(!!s)), []);
  useEffect(() => subscribeAficionado(setAfi), []);

  const pre = items.filter((i) => i.comingSoon && i.preorderEnabled && i.id);
  const teasers = items.filter((i) => i.comingSoon && !i.preorderEnabled);
  if (pre.length === 0 && teasers.length === 0) return null;

  async function reserve(it: InventoryItem) {
    if (!it.id) return;
    setState((s) => ({ ...s, [it.id!]: 'busy' }));
    const r = await placePreorder({ inventoryItemId: it.id, cigarName: `${it.brand} ${it.name}`.trim() });
    if (r.ok) { setState((s) => ({ ...s, [it.id!]: 'done' })); setRemaining((m) => ({ ...m, [it.id!]: Math.max(0, (m[it.id!] ?? 1) - 1) })); }
    else setState((s) => ({ ...s, [it.id!]: r.error ?? 'Could not reserve.' }));
  }

  return (
    <div className="mt-8">
      <h3 className="flex items-center gap-2 font-display text-xl tracking-tightest"><CalendarClock size={16} className="text-ember-400" /> Coming soon</h3>
      <div className="mt-3 space-y-2">
        {[...pre, ...teasers].map((it) => {
          const rem = it.id ? remaining[it.id] ?? it.preorderLimit ?? 0 : 0;
          const st = it.id ? state[it.id] : undefined;
          const canReserve = it.preorderEnabled && rem > 0;
          return (
            <div key={it.cigarId} className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CigarThumb slug={it.slug} brand={it.brand} fit="contain" rounded="rounded" className="h-12 w-10 shrink-0 text-[10px]" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-paper">{it.name}</div>
                    <div className="text-xs text-smoke-400">{[it.brand, it.releaseDate ? `Releases ${new Date(it.releaseDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : null].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
                {it.preorderEnabled && <span className="shrink-0 text-xs text-smoke-300">{rem} of {it.preorderLimit} left</span>}
              </div>
              {it.preorderEnabled && (
                <div className="mt-2">
                  {st === 'done' ? (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-300"><Check size={14} /> Reserved — pending the lounge’s approval. See it under Pre-Orders.</span>
                  ) : !signedIn ? (
                    <Link href={`/register?next=/lounges/${slug}`} className="text-sm text-ember-300 hover:underline">Sign up to reserve this release →</Link>
                  ) : !afi ? (
                    <Link href="/verify" className="text-sm text-ember-300 hover:underline">Pre-orders are an Aficionado benefit — upgrade to reserve →</Link>
                  ) : (
                    <button onClick={() => reserve(it)} disabled={!canReserve || st === 'busy'} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-400 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50">
                      {st === 'busy' ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />} {rem > 0 ? 'Reserve' : 'Fully reserved'}
                    </button>
                  )}
                  {typeof st === 'string' && st !== 'busy' && st !== 'done' && <p className="mt-1 text-sm text-red-300">{st}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
