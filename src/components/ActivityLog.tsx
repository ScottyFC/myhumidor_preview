'use client';

import { useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { getEvents, getLoungeEvents, describeEvent, type AuditEvent } from '@/lib/audit';
import { isSupabaseConfigured, supabaseBrowser } from '@/lib/supabase';

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function resolveLoungeId(slug: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabaseBrowser().from('lounges').select('id').eq('slug', slug).single();
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export function ActivityLog({ loungeId, slug }: { loungeId?: string; slug?: string }) {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);

  useEffect(() => {
    let off = false;
    (async () => {
      let lid = loungeId ?? null;
      if (!lid && slug) lid = await resolveLoungeId(slug);
      const e = slug || loungeId ? (lid ? await getLoungeEvents(lid) : []) : await getEvents();
      if (!off) setEvents(e);
    })();
    return () => {
      off = true;
    };
  }, [loungeId, slug]);

  if (events === null) {
    return <div className="py-10 text-center"><Loader2 className="mx-auto animate-spin text-ember-400" size={20} /></div>;
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border-[0.5px] border-dashed border-ember-400/20 p-8 text-center">
        <History className="mx-auto text-ember-400/60" size={22} strokeWidth={1.5} />
        <div className="mt-2 text-sm text-smoke-400">No activity recorded yet.</div>
      </div>
    );
  }

  return (
    <ol className="relative space-y-3 border-l-[0.5px] border-ember-400/15 pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[22px] top-1.5 h-2 w-2 rounded-full bg-ember-400/70" />
          <div className="text-sm text-paper">
            <span className="font-medium text-ember-100">{e.actorName}</span> {describeEvent(e)}
          </div>
          <div className="text-xs text-smoke-400">{ago(e.createdAt)}</div>
        </li>
      ))}
    </ol>
  );
}
