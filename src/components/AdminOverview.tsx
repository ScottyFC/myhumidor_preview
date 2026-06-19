'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Cigarette, Store, KeyRound, Building2, MessageSquare, Loader2, Inbox } from 'lucide-react';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';

const QUEUES = [
  { key: 'cigars',    label: 'Cigar submissions',  table: 'cigar_submissions',      status: 'pending', icon: Cigarette,     tab: 'cigars' },
  { key: 'lounges',   label: 'Lounge submissions', table: 'lounge_submissions',     status: 'pending', icon: Store,         tab: 'lounges' },
  { key: 'claims',    label: 'Lounge claims',      table: 'lounge_claims',          status: 'pending', icon: KeyRound,      tab: 'claims' },
  { key: 'claimreqs', label: 'Bulk claim requests',table: 'lounge_claim_requests',  status: 'pending', icon: Building2,     tab: 'claimreqs' },
  { key: 'requests',  label: 'Change requests',    table: 'change_requests',        status: 'open',    icon: MessageSquare, tab: 'requests' },
] as const;

/** Super-admin overview: pending counts across every review queue. */
export function AdminOverview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    (async () => {
      const sb = supabaseBrowser();
      const entries = await Promise.all(QUEUES.map(async (q) => {
        try {
          const { count } = await (sb.from(q.table as never) as any)
            .select('*', { count: 'exact', head: true }).eq('status', q.status);
          return [q.key, (count ?? 0) as number] as const;
        } catch { return [q.key, null] as const; }
      }));
      setCounts(Object.fromEntries(entries));
      setLoading(false);
    })();
  }, []);

  const total = Object.values(counts).reduce<number>((a, b) => a + (b ?? 0), 0);

  if (loading) return <div className="text-smoke-400"><Loader2 className="animate-spin text-ember-400" /></div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center gap-2 rounded-xl border-[0.5px] border-ember-400/25 bg-ember-400/5 px-4 py-3">
        <Inbox size={18} className="text-ember-400" />
        <span className="text-sm text-smoke-200">
          {total === 0 ? 'All caught up — no pending requests.' : <><span className="font-semibold text-ember-100">{total}</span> item{total === 1 ? '' : 's'} awaiting review across all queues.</>}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {QUEUES.map((q) => {
          const n = counts[q.key];
          const Icon = q.icon;
          return (
            <button
              key={q.key}
              onClick={() => onNavigate(q.tab)}
              className={`flex items-center justify-between gap-3 rounded-xl border-[0.5px] p-4 text-left transition ${n ? 'border-ember-400/30 bg-char/50 hover:border-ember-400/60' : 'border-ember-400/12 bg-char/30 hover:border-ember-400/30'}`}
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${n ? 'bg-ember-400/15 text-ember-300' : 'bg-char/60 text-smoke-400'}`}>
                  <Icon size={18} strokeWidth={1.5} />
                </span>
                <span className="text-sm text-smoke-200">{q.label}</span>
              </span>
              <span className={`min-w-9 rounded-full px-2.5 py-1 text-center text-sm font-semibold tabular ${n ? 'bg-ember-400 text-paper' : 'text-smoke-500'}`}>
                {n === null ? '—' : n}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
