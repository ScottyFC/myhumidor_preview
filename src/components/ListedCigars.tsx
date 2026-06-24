'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Cigarette, ExternalLink } from 'lucide-react';

interface Row { slug: string; name: string; size: string; country: string; price: number | null }

export function ListedCigars({ slug }: { slug: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    let off = false;
    fetch('/api/brand/cigars').then((r) => r.json()).then((j) => { if (!off) setRows(j.cigars ?? []); }).catch(() => { if (!off) setRows([]); });
    return () => { off = true; };
  }, []);

  return (
    <section id="listed-cigars" className="mt-8 scroll-mt-24">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Cigarette size={18} className="text-ember-400" /> Listed Cigars{rows && <span className="text-sm text-smoke-400">· {rows.length}</span>}</h2>
        <Link href={`/brands/${slug}`} className="inline-flex items-center gap-1.5 text-xs text-ember-400 hover:underline">View brand page <ExternalLink size={12} /></Link>
      </div>
      <div className="mt-3 rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-4">
        {rows === null ? <Loader2 className="animate-spin text-ember-400" />
          : rows.length === 0 ? <p className="text-sm text-smoke-400">No cigars are listed under your brand yet. As cigars are added to the MyHumidor catalog under your brand, they’ll appear here and on your public page.</p>
          : (
            <div className="divide-y divide-ember-400/10">
              {rows.map((c) => (
                <Link key={c.slug} href={`/cigars/${c.slug}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-ember-100">
                  <span className="font-medium text-paper">{c.name}</span>
                  <span className="text-xs text-smoke-400">{[c.size, c.country].filter(Boolean).join(' · ')}{typeof c.price === 'number' ? ` · $${c.price.toFixed(2)}` : ''}</span>
                </Link>
              ))}
            </div>
          )}
      </div>
    </section>
  );
}
