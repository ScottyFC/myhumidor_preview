'use client';
import { useEffect, useState } from 'react';
import { Award, Check } from 'lucide-react';
import { supabaseBrowser, isSupabaseConfigured } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { subscribeAuth } from '@/lib/auth';
import { earnedBadgeIds } from '@/lib/badges';

interface B { id: string; name: string; criteria: string | null; image_url: string | null }

export function BrandBadgeShowcase({ brandId }: { brandId: string }) {
  const [badges, setBadges] = useState<B[]>([]);
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => subscribeAuth((s) => setUid(s?.uuid ?? null)), []);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      try {
        const db = supabaseBrowser() as unknown as SupabaseClient;
        const { data } = await db.from('badges').select('id, name, criteria, image_url').eq('brand_id', brandId).eq('status', 'active');
        setBadges((data ?? []) as B[]);
      } catch { /* ignore */ }
    })();
  }, [brandId]);
  useEffect(() => { if (uid) earnedBadgeIds(uid).then(setEarned); }, [uid, badges.length]);

  if (badges.length === 0) return null;
  return (
    <div className="mt-10">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><Award size={18} className="text-ember-400" /> Badges to earn</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => {
          const has = earned.has(b.id);
          return (
            <div key={b.id} className={`flex items-center gap-3 rounded-xl border-[0.5px] p-3 ${has ? 'border-ember-400/40 bg-ember-400/5' : 'border-ember-400/15 bg-char/30'}`}>
              {b.image_url
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-contain bg-char/60" />
                : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-char/60 text-smoke-500"><Award size={20} /></span>}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-medium text-paper">{b.name} {has && <span className="inline-flex items-center gap-0.5 rounded-full bg-ember-400/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ember-200"><Check size={10} /> Earned</span>}</div>
                {b.criteria && <div className="text-xs text-smoke-400">{b.criteria}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
