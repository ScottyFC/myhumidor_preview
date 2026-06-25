'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Store, MapPin, BadgeCheck, Loader2 } from 'lucide-react';

interface Row { slug: string; name: string; city: string; state: string; price: number | null; certified: boolean }

/**
 * Nationwide "who stocks this" view for brand + lounge operators. Brands get a
 * rundown of every lounge carrying the cigar; lounges see who else stocks it.
 */
export function StockingNationwide({ slug, viewer }: { slug: string; viewer: 'brand' | 'lounge' }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let off = false;
    fetch(`/api/cigars/${slug}/stocking`).then((r) => r.json()).then((d) => { if (!off) setRows(d.items ?? []); }).catch(() => !off && setRows([]));
    return () => { off = true; };
  }, [slug]);

  const title = viewer === 'brand' ? 'Lounges stocking this cigar' : 'Who is stocking this cigar';
  const states = rows ? new Set(rows.map((r) => r.state).filter(Boolean)).size : 0;

  return (
    <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-5">
      <div className="flex items-center gap-2">
        <Store size={16} className="text-ember-400" />
        <h3 className="font-display text-lg">{title}</h3>
      </div>
      <p className="mt-1 text-sm text-smoke-400">
        {viewer === 'brand'
          ? 'A nationwide rundown of every lounge that lists this cigar in stock — your retail footprint at a glance.'
          : 'Lounges across the country currently listing this cigar.'}
      </p>

      {rows === null && <div className="mt-3 flex items-center gap-2 text-sm text-smoke-300"><Loader2 size={14} className="animate-spin text-ember-400" /> Loading…</div>}
      {rows && rows.length === 0 && <p className="mt-3 text-sm text-smoke-400">No lounges list this cigar in stock yet.</p>}
      {rows && rows.length > 0 && (
        <>
          <div className="mt-3 flex gap-4 text-sm">
            <span className="text-paper"><span className="font-display text-xl text-ember-100">{rows.length}</span> {rows.length === 1 ? 'lounge' : 'lounges'}</span>
            <span className="text-paper"><span className="font-display text-xl text-ember-100">{states}</span> {states === 1 ? 'state' : 'states'}</span>
          </div>
          <ul className="mt-3 max-h-96 divide-y divide-ember-400/10 overflow-y-auto">
            {rows.map((l) => (
              <li key={l.slug}>
                <Link href={`/lounges/${l.slug}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-ember-100">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium text-paper">{l.name} {l.certified && <BadgeCheck size={13} className="shrink-0 text-ember-400" />}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-smoke-400"><MapPin size={10} /> {[l.city, l.state].filter(Boolean).join(', ') || '—'}</span>
                  </span>
                  {l.price != null && <span className="shrink-0 text-xs tabular text-smoke-300">${l.price}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
