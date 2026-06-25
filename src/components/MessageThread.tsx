'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { BrokerMessage } from '@/lib/broker';

/** Generic thread view; the parent injects the side-specific fetch/send. */
export function MessageThread({ threadId, viewer, load, send }: {
  threadId: string; viewer: 'brand' | 'lounge';
  load: (id: string) => Promise<{ ok: boolean; messages: BrokerMessage[] }>;
  send: (id: string, body: string) => Promise<{ ok: boolean }>;
}) {
  const [msgs, setMsgs] = useState<BrokerMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function refresh() { const r = await load(threadId); if (r.ok) setMsgs(r.messages); }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [threadId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  async function submit() {
    const body = text.trim(); if (!body) return;
    setBusy(true); setText('');
    const r = await send(threadId, body); setBusy(false);
    if (r.ok) refresh(); else setText(body);
  }

  return (
    <div className="flex h-80 flex-col rounded-xl border-[0.5px] border-ember-400/15 bg-char/40">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {msgs.length === 0 && <p className="py-8 text-center text-sm text-smoke-500">No messages yet — say hello.</p>}
        {msgs.map((m) => {
          const mine = m.sender_type === viewer;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-ember-400 text-ink' : 'bg-char/80 text-paper'}`}>
                {m.body}
                <div className={`mt-0.5 text-[10px] ${mine ? 'text-ink/60' : 'text-smoke-500'}`}>{new Date(m.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 border-t-[0.5px] border-ember-400/15 p-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} placeholder="Message…" className="min-w-0 flex-1 rounded-lg border-[0.5px] border-ember-400/20 bg-char/60 px-3 py-2 text-sm text-paper placeholder:text-smoke-500 focus:border-ember-400/50 focus:outline-none" />
        <button onClick={submit} disabled={busy} className="flex h-9 w-9 items-center justify-center rounded-lg bg-ember-400 text-ink disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}</button>
      </div>
    </div>
  );
}
