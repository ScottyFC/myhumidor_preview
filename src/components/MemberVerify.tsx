'use client';

import { useEffect, useState } from 'react';
import { Crown, Loader2, Search, Check, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase';

interface Member {
  handle: string;
  displayName: string;
  city?: string | null;
  state?: string | null;
  aficionado: boolean;
}

/** Admin: search members and toggle their Verified Aficionado status. */
export function MemberVerify() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    let off = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(term)}&limit=8`);
        const d = await res.json();
        if (!off) setResults(d.items ?? []);
      } catch { if (!off) setResults([]); }
      finally { if (!off) setLoading(false); }
    }, 250);
    return () => { off = true; clearTimeout(t); };
  }, [q]);

  async function toggle(m: Member) {
    setBusy(m.handle); setErr('');
    try {
      const { data, error } = await supabaseBrowser().rpc('set_aficionado', { p_handle: m.handle, p_on: !m.aficionado });
      if (error) throw new Error(error.message);
      setResults((rs) => rs.map((r) => (r.handle === m.handle ? { ...r, aficionado: !!data } : r)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search size={15} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-smoke-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search members by name or @handle…"
          className="w-full rounded-md border-[0.5px] border-ember-400/20 bg-char/80 py-2 pl-9 pr-3 text-sm text-paper placeholder:text-smoke-400 focus:border-ember-400 focus:outline-none"
        />
      </div>

      {err && <p className="mb-3 text-xs text-red-400">{err}</p>}
      {loading && <Loader2 size={16} className="animate-spin text-ember-400" />}

      <div className="space-y-2">
        {results.map((m) => (
          <div key={m.handle} className="flex items-center justify-between gap-3 rounded-lg border-[0.5px] border-ember-400/15 bg-char/50 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-paper">{m.displayName}</span>
                {m.aficionado && (
                  <span className="inline-flex items-center gap-1 rounded-full border-[0.5px] border-ember-400/40 bg-ember-400/10 px-2 py-0.5 text-[10px] font-medium text-ember-100">
                    <Crown size={10} strokeWidth={1.5} className="text-ember-400" /> Aficionado
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-smoke-400">
                @{m.handle}{[m.city, m.state].filter(Boolean).length ? ` · ${[m.city, m.state].filter(Boolean).join(', ')}` : ''}
              </div>
            </div>
            <button
              onClick={() => toggle(m)}
              disabled={busy === m.handle}
              className={
                m.aficionado
                  ? 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border-[0.5px] border-ember-400/30 px-3 text-xs font-medium text-smoke-200 transition hover:border-red-400/50 hover:text-red-400'
                  : 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-ember-400 px-3 text-xs font-medium text-paper transition hover:bg-ember-600'
              }
            >
              {busy === m.handle ? <Loader2 size={13} className="animate-spin" />
                : m.aficionado ? <><X size={13} strokeWidth={2} /> Revoke</>
                : <><Check size={13} strokeWidth={2} /> Verify as Aficionado</>}
            </button>
          </div>
        ))}
        {!loading && q.trim().length >= 2 && results.length === 0 && (
          <p className="text-sm text-smoke-400">No members match “{q}”.</p>
        )}
      </div>
    </div>
  );
}
