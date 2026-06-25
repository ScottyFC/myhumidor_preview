'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { getBrandThreads, getBrandMessages, sendBrandMessage } from '@/lib/broker';
import { MessageThread } from '@/components/MessageThread';

export function BrandMessages() {
  const [threads, setThreads] = useState<{ id: string; last_message_at: string; lounges?: { name: string; slug: string } }[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const load = useCallback(async () => { const r = await getBrandThreads(); setThreads(r.threads ?? []); if (!active && r.threads?.[0]) setActive(r.threads[0].id); }, [active]);
  useEffect(() => { load(); }, [load]);

  return (
    <section id="messages" className="mt-8 scroll-mt-24">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tightest"><MessageSquare size={18} className="text-ember-400" /> Messages</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
        <div className="rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-2">
          {threads === null && <Loader2 className="m-3 animate-spin text-ember-400" />}
          {threads && threads.length === 0 && <p className="p-3 text-sm text-smoke-400">No conversations yet.</p>}
          {threads?.map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${active === t.id ? 'bg-ember-400/15 text-ember-100' : 'text-smoke-300 hover:bg-ember-400/5'}`}>{t.lounges?.name ?? 'Lounge'}</button>
          ))}
        </div>
        {active
          ? <MessageThread threadId={active} viewer="brand" load={getBrandMessages} send={sendBrandMessage} />
          : <div className="flex items-center justify-center rounded-xl border-[0.5px] border-ember-400/15 bg-char/30 p-8 text-sm text-smoke-500">Select a conversation.</div>}
      </div>
    </section>
  );
}
