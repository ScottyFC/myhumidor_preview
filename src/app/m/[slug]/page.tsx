'use client';

import { useEffect, useState } from 'react';
import { getPublishedMenu, type InventoryItem } from '@/lib/inventory';
import { fetchProfileByHandle } from '@/lib/profile';
import { supabaseBrowser, isSupabaseConfigured } from '@/lib/supabase';

export default function MenuDisplay({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loungeName, setLoungeName] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let off = false;
    async function load() {
      const menu = await getPublishedMenu(slug);
      if (off) return;
      setItems(menu);
      setReady(true);
    }
    async function loadName() {
      if (!isSupabaseConfigured) return;
      try {
        const { data } = await supabaseBrowser().from('lounges').select('name').eq('slug', slug).single();
        if (!off && data?.name) setLoungeName(data.name);
      } catch { /* ignore */ }
    }
    load(); loadName();
    // refresh every 2 minutes so the screen stays current
    const t = setInterval(load, 120000);
    return () => { off = true; clearInterval(t); };
  }, [slug]);

  return (
    <div className="min-h-screen bg-char text-paper">
      <div className="mx-auto max-w-6xl px-10 py-12">
        <div className="flex items-baseline justify-between border-b border-ember-400/20 pb-6">
          <div>
            <div className="eyebrow text-ember-400">Tonight at</div>
            <h1 className="font-display text-6xl tracking-tightest">{loungeName || 'Our Lounge'}</h1>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="CigarTV" className="h-10 w-auto opacity-80" />
        </div>

        {!ready ? (
          <div className="py-24 text-center text-2xl text-smoke-400">Loading menu…</div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center text-2xl text-smoke-400">Menu coming soon.</div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-5 md:grid-cols-2">
            {items.map((it) => (
              <div key={it.cigarId} className="flex items-baseline gap-3 border-b border-dashed border-ember-400/15 pb-4">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-3xl tracking-tightest text-paper">{it.brand}</div>
                  <div className="text-lg text-smoke-200">{it.name}{it.size ? <span className="text-smoke-400"> · {it.size}</span> : null}</div>
                </div>
                {it.price > 0 && <div className="tabular shrink-0 font-display text-3xl text-ember-400">${it.price.toFixed(2)}</div>}
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center text-xs uppercase tracking-widest text-smoke-500">
          Powered by MyHumidor · CigarTV
        </div>
      </div>
    </div>
  );
}
