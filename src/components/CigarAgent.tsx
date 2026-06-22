'use client';

import { useRef, useState } from 'react';
import { CigarName } from '@/components/CigarName';
import Link from 'next/link';
import { Sparkles, SendHorizonal, Loader2 } from 'lucide-react';
import { BrandTile } from '@/components/BrandTile';

interface Pick {
  slug: string; brand: string; name: string; country: string | null;
  size: string; price: number | null; image_url?: string | null; reasons: string[];
}
interface Msg { role: 'user' | 'agent'; text: string; picks?: Pick[] }

const SUGGESTIONS = [
  'Full-bodied Nicaraguan with cocoa under $15',
  'A smooth morning smoke with cream notes',
  'Something like Padrón for a special night',
  'Peppery robusto between $8 and $12',
];

/** The Cigar Concierge — natural-language search over the live catalog. */
export function CigarAgent() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function ask(q: string) {
    const query = q.trim();
    if (!query || busy) return;
    setMsgs((m) => [...m, { role: 'user', text: query }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/cigar-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const d = await res.json();
      setMsgs((m) => [...m, { role: 'agent', text: d.reply, picks: d.picks }]);
    } catch {
      setMsgs((m) => [...m, { role: 'agent', text: 'Connection hiccup — try again.' }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    }
  }

  return (
    <section className="relative mb-10 overflow-hidden rounded-2xl border-[0.5px] border-ember-400/25 bg-gradient-to-b from-ember-400/[0.07] to-char/40">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(240,195,85,0.16), transparent 70%)' }}
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ember-400/15 ring-1 ring-ember-400/30">
            <Sparkles size={15} strokeWidth={1.5} className="text-ember-300" />
          </span>
          <div>
            <h2 className="font-display text-xl tracking-tightest">Cigar Concierge</h2>
            <p className="text-xs text-smoke-400">Describe what you&apos;re in the mood for — I&apos;ll search all 24,000+ cigars.</p>
          </div>
        </div>

        {/* Conversation */}
        {msgs.length > 0 && (
          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {msgs.map((m, i) => (
              <div key={i}>
                <div
                  className={
                    m.role === 'user'
                      ? 'ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-ember-400/90 px-3.5 py-2 text-sm text-paper'
                      : 'w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-char/80 px-3.5 py-2 text-sm text-smoke-100 ring-1 ring-ember-400/15'
                  }
                >
                  {m.text}
                </div>
                {m.picks && m.picks.length > 0 && (
                  <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
                    {m.picks.map((p) => (
                      <Link key={p.slug} href={`/cigars/${p.slug}`} className="group w-36 shrink-0">
                        <div className="relative">
                          <BrandTile name={p.brand} src={p.image_url} fit="contain" rounded="rounded-lg"
                            className="aspect-[4/5] w-full text-2xl transition group-hover:ring-1 group-hover:ring-ember-400/50" />
                          {p.price != null && (
                            <span className="absolute bottom-1.5 right-1.5 rounded bg-char/90 px-1 py-0.5 font-display text-[11px] tabular text-ember-100">
                              ${p.price}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug group-hover:text-ember-100"><CigarName slug={p.slug} name={p.name} /></div>
                        {p.reasons[0] && <div className="mt-0.5 line-clamp-1 text-[10px] text-ember-200/80">{p.reasons[0]}</div>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}

        {/* Suggestions (until first message) */}
        {msgs.length === 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((sg) => (
              <button key={sg} onClick={() => ask(sg)}
                className="rounded-full border-[0.5px] border-ember-400/25 bg-char/50 px-3 py-1.5 text-xs text-smoke-200 transition hover:border-ember-400/50 hover:text-ember-100">
                {sg}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="mt-4 flex items-center gap-2 rounded-full border-[0.5px] border-ember-400/25 bg-char/70 py-1.5 pl-4 pr-1.5 focus-within:border-ember-400/60">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(input)}
            placeholder="e.g. peppery Nicaraguan toro under $12…"
            className="min-w-0 flex-1 bg-transparent text-sm text-paper placeholder:text-smoke-500 focus:outline-none"
          />
          <button
            onClick={() => ask(input)}
            disabled={busy || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ember-400 text-paper transition hover:bg-ember-600 disabled:opacity-50"
            aria-label="Ask"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </section>
  );
}
