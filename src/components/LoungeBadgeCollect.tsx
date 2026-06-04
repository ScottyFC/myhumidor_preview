'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';
import { subscribeAuth } from '@/lib/auth';
import { listLoungeBadges, earnedBadgeIds, collectBadge, type BadgeDef } from '@/lib/badges';
import { BadgeMedal } from '@/components/BadgeMedal';

export function LoungeBadgeCollect({ slug }: { slug: string }) {
  const [badges, setBadges] = useState<BadgeDef[]>([]);
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => subscribeAuth((s) => setUserId(s?.uuid ?? null)), []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data: l } = await supabaseBrowser().from('lounges').select('id').eq('slug', slug).single();
      if (!l) return;
      setBadges(await listLoungeBadges(l.id));
      if (userId) setEarned(await earnedBadgeIds(userId));
    })();
  }, [slug, userId]);

  if (badges.length === 0) return null;

  async function collect(b: BadgeDef) {
    if (!userId) return;
    setBusy(b.id);
    const ok = await collectBadge(userId, b.id);
    setBusy(null);
    if (ok) setEarned((prev) => new Set(prev).add(b.id));
  }

  return (
    <div className="mt-10">
      <h2 className="eyebrow mb-3">Collectible badges</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {badges.map((b) => (
          <div key={b.id} className="flex flex-col items-center gap-2">
            <BadgeMedal badge={b} earned={earned.has(b.id)} size={104} />
            {earned.has(b.id) ? (
              <span className="inline-flex items-center gap-1 text-xs text-ember-100"><Check size={12} strokeWidth={2} /> Collected</span>
            ) : userId ? (
              <button onClick={() => collect(b)} disabled={busy === b.id} className="btn-ghost text-xs">
                {busy === b.id ? <Loader2 size={12} className="animate-spin" /> : null} Collect
              </button>
            ) : (
              <Link href="/register" className="text-xs text-smoke-400 hover:text-ember-100">Sign in to collect</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
